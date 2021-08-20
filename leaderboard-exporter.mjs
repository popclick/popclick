#!/usr/bin/env -S node
'use strict';

import fetch from 'node-fetch'
import https from 'https'
import http from 'http'
import {
    POP_MODE,
    EXPORTER_PORT,
    HEADERS,
} from './constants.mjs'
import {
    getLeaderboardURL,
    getIP,
} from './functions.mjs'

let ips = []
const getIPs = () => {
    ips = getIP(true)
}
getIPs()
setInterval(getIPs, 30 * 1000) // every 30s refresh valid ip addresses list
let lastest = {}
let successTime = Date.now()
let exporter_header = `
# HELP pop${POP_MODE} By Region counter.
# TYPE pop${POP_MODE} counter
`.trim()
let output_exporter = ""
const export_exporter = () => {
    let exporter = ""
    for(var k in lastest) {
        let v = lastest[k]
        let st = successTime
        const l = `pop${POP_MODE}{region="${k}"}`
        if (POP_MODE == "pig") {
            st = v.lastupdate
            v = v.score
        }
        console.log(l, v, st)
        exporter += `${l} ${v} ${st}\n`
    }
    if (exporter.length > 0) {
        output_exporter = `${exporter_header}\n${exporter}`.trim()
    }
}
const url = getLeaderboardURL()

const get_lb = () => {
    const httpsAgent = new https.Agent({
        keepAlive: true,
        localAddress: ips.random(),
    });
    let headers = {}
    headers['Host'] = (new URL(url)).host
    fetch(url, {
        headers: Object.assign(headers, HEADERS),
        method: 'GET',
        agent: httpsAgent,
    }).then(async res => {
        if (res.ok) {
            const leaderboard = await res.json()
            lastest = leaderboard
            successTime = Date.now()
        }
    }).catch(e => console.error("request error.", e))
    export_exporter()
}
setInterval(get_lb, 5000)
get_lb()
const server = http.createServer((req, res) => {
    if (req.url === "/metrics") {
        const output = output_exporter
        if (output.length > 0) {
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.write(output)
        } else {
            res.writeHead(429, { 'Content-Type': 'text/plain' })
        }
        res.end()
    }
});
server.listen(EXPORTER_PORT - 1000)
