#!/usr/bin/env -S node
'use strict';

import { spawnSync } from 'child_process'
import fetch from 'node-fetch'
import https from 'https'
import AbortController from "abort-controller"
import lodash from 'lodash'
import colors from 'colors'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { MeterProvider } from '@opentelemetry/metrics'
import {
    DEBUG,
    POP_MODE,
    EXPORTER_PORT,
    DOG_UUID,
    DOG_NAME,
    MAX_CONNECTIONS,
    MINIMUM_COLDDOWN_TIME_PER_IP,
    LOGGER_INTERVAL,
    SPAWN_RATE_MS,
    REFRESH_IP_LIST_INTERVAL,
    RANDOM_LOWER,
    RANDOM_UPPER,
    USE_REAL_RECAPTCHA,
    HEADERS,
} from './constants.mjs'
import {
    formatNum,
    randomNumber,
    getRecaptchaURL,
    getFakeCaptchaToken,
    getPopURL,
    diff,
    padNum,
    padDiff,
    getIP,
} from './functions.mjs'

// following has deleted 10 lines for bypass CDN human-check code, and that is the key point for higher hit rate

// Prometheus Exporter
const meter = new MeterProvider({ exporter: new PrometheusExporter({ port: EXPORTER_PORT, prefix: `pop${POP_MODE}` }), interval: 1000, }).getMeter('prometheus')
const connectionCounter = meter.createUpDownCounter('connection', { description: 'Open connections.' })
const requestCounter = meter.createCounter('request', { description: 'Request counter with status.' })
const successCounter = requestCounter.bind({ status: "success" })
const popCounter = meter.createCounter('pop', { description: 'Pop pop pop.' })

// Main
let ips = getIP(true)
let initial = 0
let concurrent = 0
let colddown = 0
let previousMeter = {}
let errLogs = []
let signals = {}
setInterval(() => { // Console statics logger
    setImmediate(() => {
        // messages
        const ms = [
            ["Pop:", padNum(formatNum(0), MAX_CONNECTIONS.toString().length + 3)],
            ["Init:", padNum(formatNum(initial), MAX_CONNECTIONS.toString().length + 3)],
            ["Con:", padNum(formatNum(concurrent), MAX_CONNECTIONS.toString().length + 3)],
            ["CD:", padNum(formatNum(colddown), MAX_CONNECTIONS.toString().length + 3)],
            ["Poped:", padNum(formatNum(0), MAX_CONNECTIONS.toString().length + 3)],
            ["Suc:", padNum(formatNum(0), MAX_CONNECTIONS.toString().length + 3)],
        ]
        // hardcode to dump values from prometheus exporter
        meter._processor._batchMap.forEach((v, k) => {
            // DEBUG && console.log(k, v, v.aggregator._current)
            const c = v.aggregator._current
            let pk = ""
            let d = ""
            switch (k) {
                case "pop":
                    pk = "poped"
                    d = diff(previousMeter[pk], c)
                    ms[ms.findIndex((e) => e[0] === "Poped:")][1] = padDiff(c, d)
                    break
                default:
                    pk = Object.assign([v.labels.status], [v.labels.code].filter(f => f))
                    d = diff(previousMeter[pk], c)
                    switch (v.labels.status) {
                        case "success":
                            ms[ms.findIndex((e) => e[0] === "Suc:")][1] = padDiff(c, d)
                            break
                        case "fail":
                            const lb = `${v.labels.code}:`
                            const fid = Object.assign(ms.length, ms.findIndex((e) => e[0] === lb))
                            const failDiff = [padNum(formatNum(c), 7), "+", padNum(formatNum(d), 3)]
                            ms[fid] = Object.assign(Object.assign([], ms[fid]), [lb, failDiff])
                            break
                        case "pop":
                            ms[ms.findIndex((e) => e[0] === "Pop:")][1] = padNum(formatNum(c), MAX_CONNECTIONS.toString().length + 3)
                            break
                        default:
                            pk = ""
                            d = ""
                            break
                    }
                    break
            }
            if (pk.length > 0) {
                previousMeter[pk] = c
            }
        })
        // print all of distinct error message first
        if (errLogs.length > 0) {
            const errs = lodash.uniqWith(errLogs, lodash.isEqual)
            errLogs.splice(0, errLogs.length)
            errs.forEach(e => console.error('Error:'.red, ...e))
        }
        // then print all of current stats
        console.log(...ms.flat(4))
    })
}, LOGGER_INTERVAL)

// the main request generator
const main = (ip) => {
    initial++
    connectionCounter.add(1, { status: "init" })
    const httpsAgent = new https.Agent({
        keepAlive: true,
        localAddress: ip,
    })
    let uuid = ""
    let token = ""
    let cookie = new Map()
    let ready = false
    let isIPReadyToUse = true
    let requestStartTime = Date.now()
    // following 3 variables are meanless, which is poppig uses but server always says I have 99 remains ????
    let rateLimit = 100
    let rateRemain = 100
    let nextResetTime = Date.now() + 3 * 60 * 1000
    const controller = signals[ip]
    controller.signal.addEventListener("abort", () => { // abort means IP has been removed, which notified from IP monitor section
        isIPReadyToUse = false
        DEBUG && console.warn(ip, "aborted!".yellow)
    })

    // main loop for endless loop, until IP removed or user terminated
    setImmediate(async () => {
        while (true) {
            requestStartTime = Date.now() // always update first
            const popOnce = randomNumber(RANDOM_LOWER, RANDOM_UPPER)
            await new Promise((resolve, reject) => { // check concurrent
                if (!isIPReadyToUse) {
                    reject()
                } else {
                    if (rateRemain > 0) {
                        concurrent++
                        resolve()
                    }
                }
            }).then(async () => { // prepare initial values
                switch (POP_MODE) {
                    case "pig":
                        if (uuid.length == 0 || token.length == 0) {
                            await new Promise(async resolve => {
                                let tryProcessUUIDToken = null
                                const prepare = async () => {
                                    try {
                                        await fetch("https://poppig.click/getuuid", {
                                            signal: controller.signal,
                                            method: 'GET',
                                            agent: httpsAgent,
                                        }).then(d=>d.json())
                                            .then(j=>j.uuid)
                                            .then(async u => {
                                                uuid = u
                                                await fetch(`https://poppig.click/gettoken?uuid=${uuid}`, {
                                                    signal: controller.signal,
                                                    method: 'GET',
                                                    agent: httpsAgent,
                                                }).then(d=>d.json())
                                                    .then(j=>j.token)
                                                    .then(t => {
                                                        token = t
                                                        // new token must wait 10s, otherwise will bounced 102 (aka 429)
                                                        setTimeout(resolve, 10 * 1000)
                                                }).catch(reason => {
                                                    DEBUG && console.error(reason)
                                                    errLogs.push([0, reason])
                                                })
                                        }).catch(reason => {
                                            DEBUG && console.error(reason)
                                            errLogs.push([0, reason])
                                        })
                                    } catch (error) {
                                        if (error.type === 'aborted') {
                                            requestCounter.add(1, { status: "fail", code: "-1" })
                                            errLogs.push([-1, "request aborted.", error.type, error.code, ip, error])
                                        } else {
                                            requestCounter.add(1, { status: "fail", code: "0" })
                                            errLogs.push([0, "request error.", error.type, error.code, ip, error])
                                        }
                                        tryProcessUUIDToken = setTimeout(() => {
                                            prepare()
                                        }, 1000)
                                    }
                                }
                                prepare()
                            })
                        }
                        break
                    default:
                        break
                }
            }).then(async () => { // get recaptcha token
                if (USE_REAL_RECAPTCHA) { // default is generate with fake one, because they doesn't verify the recaptcha token
                    const recaptchaURL = getRecaptchaURL()
                    let recaptchaToken = ""
                    try {
                        recaptchaToken = await fetch(recaptchaURL, { signal: controller.signal, agent: httpsAgent })
                            .then(res => res.text())
                            .then(text => text.match(/<input type="hidden" id="recaptcha-token" value="([^"]+)">/)[1])
                    } catch (error) {
                        requestCounter.add(1, { status: "fail", code: "0" })
                        errLogs.push([0, "request to recaptcha error.", error.type, error.code, ip, recaptchaURL])
                        recaptchaToken = getFakeCaptchaToken() // if we can't get real one, use fake one
                    }
                    return recaptchaToken
                } else {
                    return POP_MODE.match(/dog/i) ? "I'm a dog" : getFakeCaptchaToken()
                }
            }).then(async recaptchaToken => { // pop pop pop
                requestStartTime = Date.now()
                const reqURL = getPopURL(popOnce, recaptchaToken, token)
                try {
                    let headers = {}
                    if (Array.from(cookie).length > 0) {
                        headers["Cookie"] = Array.from(cookie).map(([key, value]) => `${key}=${value}`).join('; ')
                    }
                    switch (POP_MODE) {
                        case "dog":
                            headers['Content-Type'] = 'application/json;charset=utf-8'
                            break
                        case "ass":
                            headers['Accept'] = "application/json, text/plain, */*"
                            headers['Content-Type'] = 'application/x-www-form-urlencoded'
                            break
                        case "pig":
                            headers['Content-Type'] = 'application/json'
                            break
                        default:
                            break
                    }
                    headers['Host'] = (new URL(reqURL)).host
                    let reqOptions = {
                        signal: controller.signal,
                        headers: Object.assign(headers, HEADERS),
                        method: 'POST',
                        agent: httpsAgent,
                    }
                    switch (POP_MODE) {
                        case "dog":
                            reqOptions['body'] = JSON.stringify({
                                clicks: popOnce,
                                uuid: DOG_UUID,
                                username: DOG_NAME,
                            })
                            break
                        case "ass":
                            reqOptions['body'] = null
                            break
                        case "pig":
                            reqOptions['body'] = JSON.stringify({
                                token: token,
                                clicked: popOnce,
                            })
                            break
                        default:
                            break
                    }
                    const res = await fetch(reqURL, reqOptions)
                    const rawHeaders = res.headers.raw()
                    const newCookie = rawHeaders['set-cookie']
                    if (newCookie) {
                        DEBUG && console.log(newCookie)
                        for (i of newCookie) {
                            const j = i.split("=")
                            cookie.set(j[0], j[1])
                        }
                    }
                    const rateLimitLimit = rawHeaders['X-RateLimit-Limit']
                    const rateLimitRemaining = rawHeaders['X-RateLimit-Remaining']
                    const rateLimitReset = rawHeaders['X-RateLimit-Reset']
                    if (rateLimitLimit) {
                        rateLimit = rateLimitLimit
                    }
                    if (rateLimitRemaining) {
                        rateRemain = rateLimitRemaining
                    }
                    if (rateLimitReset) {
                        nextResetTime = new Date(parseInt(rateLimitReset) * 1000)
                    }
                    return res
                } catch (error) {
                    if (error.type === 'aborted') {
                        requestCounter.add(1, { status: "fail", code: "-1" })
                        errLogs.push([-1, "request aborted.", error.type, error.code, ip, reqURL])
                    } else {
                        requestCounter.add(1, { status: "fail", code: "0" })
                        errLogs.push([0, "request error.", error.type, error.code, ip, reqURL])
                    }
                    throw error
                } finally {
                    connectionCounter.add(0, { status: "pop" }) // just pop nothing to prevent metrics disappear
                    concurrent--
                }
            }).then(async res => { // process pop response
                try {
                    if (res.ok) {
                        let json = {}
                        if (res.status != 204) {
                            json = await res.json()
                        }
                        let success = true
                        let failCode = ""
                        switch (POP_MODE) {
                            case "cat":
                                // if token is empty or undefined, then clear that for wait re-generate from server
                                token = json.Token || ""
                                DEBUG && errLogs.push([-3, json.Location])
                                break
                            case "dog":
                                const dog = json
                                DEBUG && errLogs.push([-3, JSON.stringify(dog)])
                                break
                            case "ass":
                                DEBUG && errLogs.push([-3, json])
                                break
                            case "pig":
                                // if token is empty or undefined, re-use previous one
                                token = json.token || token
                                DEBUG && errLogs.push([-3, json])
                                if (json.status != 0) {
                                    success = false
                                    failCode = json.status
                                }
                                break
                            default:
                                break
                        }
                        if (success) {
                            if (!ready) {
                                ready = true
                                initial--
                                connectionCounter.add(-1, { status: "init" })
                                connectionCounter.add(1, { status: "pop" })
                            }
                            successCounter.add(1)
                            popCounter.add(popOnce)
                        } else {
                            if (failCode.length > 0) {
                                requestCounter.add(1, { status: "fail", code: failCode })
                            }
                        }
                    } else {
                        const text = await res.text()
                        requestCounter.add(1, { status: "fail", code: res.status.toString() })
                        errLogs.push([res.status, res.statusText, text])
                        DEBUG && console.log(text)
                    }
                } catch (error) {
                    if (error.type === 'aborted') {
                        requestCounter.add(1, { status: "fail", code: "-1" })
                        errLogs.push([-1, "parse aborted.", error.type, error.code, ip])
                    } else {
                        requestCounter.add(1, { status: "fail", code: "0" })
                        errLogs.push([0, "parse error.", error.type, error.code, ip])
                    }
                    throw error
                }
            }).catch(reason => { // if any failed, try to check IP is available ?
                DEBUG && console.error(reason)
                isIPReadyToUse = ips.includes(ip)
            })
            if (!isIPReadyToUse) {
                const noIP = `${ip} was removed on system, terminating this fetch instance`
                errLogs.push([-1, noIP])
                if (!ready) {
                    initial--
                    connectionCounter.add(-1, { status: "init" })
                } else {
                    connectionCounter.add(-1, { status: "pop" })
                }
                break
            }
            const elapsedTime = Date.now() - requestStartTime
            const reducedTime = Math.abs(MINIMUM_COLDDOWN_TIME_PER_IP - elapsedTime) // might used over CD time, then it will be minus, so get abs
            const nextTime = Math.min(MINIMUM_COLDDOWN_TIME_PER_IP, reducedTime) // get minimum from CD time or reduced time
            await new Promise(resolve => {
                colddown++
                connectionCounter.add(1, { status: "cd" })
                setTimeout(() => {
                    colddown--
                    connectionCounter.add(-1, { status: "cd" })
                    resolve()
                }, nextTime)
            })
        }
        errLogs.push([-1, ip, "job was terminated"])
    })
}

// main loop wrapper for IP monitor
const dynamicMain = async (noDiff) => {
    let tempIPs = ips
    let addedIPs = tempIPs
    let removedIPs = []
    let nIP = getIP()
    if (!noDiff) { // first run is no diff can use, bypass this
        addedIPs = lodash.difference(nIP, tempIPs)
        removedIPs = lodash.difference(tempIPs, nIP)
        if (addedIPs.length > 0 || removedIPs.length > 0) {
            console.log(...[
                "We found",
                padNum(formatNum(addedIPs.length), MAX_CONNECTIONS.toString().length + 3),
                "added IP addresses and",
                padNum(formatNum(removedIPs.length), MAX_CONNECTIONS.toString().length + 3),
                "removed IP addresses"
            ].flat())
            ips = nIP
        }
    }
    // any changes then display differents
    if (addedIPs.length > 0 || removedIPs.length > 0) {
        console.log(...[
            "Run next changed batch:",
            "+",
            padNum(formatNum(addedIPs.length), MAX_CONNECTIONS.toString().length + 3),
            "-",
            padNum(formatNum(removedIPs.length), MAX_CONNECTIONS.toString().length + 3),
        ].flat())
    }
    // abort all of removed IP requests
    for (const ip of removedIPs) {
        (signals[ip] || {
            abort: () => {
                errLogs.push([0, "Can't abort this job for", ip, "because that abort controller has not initialized"])
            }
        }).abort()
    }
    // initializing all request on your system by IP address
    for await (const ip of addedIPs) {
        const controller = new AbortController()
        signals[ip] = controller
        main(ip)
        // delay control for control initializing concurrent
        await new Promise(resolve => {
            const workerTimer = setInterval(async () => {
                if (concurrent < MAX_CONNECTIONS) {
                    if (workerTimer != null) {
                        clearInterval(workerTimer)
                        resolve()
                    }
                }
            }, SPAWN_RATE_MS)
        })
    }
}
await dynamicMain(true) // for first initialize, all finished then doing every 30s IP watch
setInterval(dynamicMain, REFRESH_IP_LIST_INTERVAL) // refresh ip addresses, default is 30s, it will starts after first initialized
