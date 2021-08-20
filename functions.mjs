'use strict';

import { networkInterfaces } from 'os'
import { sizeFormatter } from 'human-readable'
import crypto from 'crypto'
import {
    POP_MODE,
    MAX_CONNECTIONS,
    RECAPTCHA_KEYS,
    BONGOS_IP,
} from './constants.mjs'

export const formatNum = sizeFormatter({
    std: 'SI', // 'SI' (default) | 'IEC' | 'JEDEC'
    decimalPlaces: 2,
    keepTrailingZeroes: false,
    render: (literal, symbol) => [
        (!!literal.match(/(−|-)/g) ? -1 : 1) * parseFloat(literal.replace(/(−|-)/g, '')),
        Object.assign([' '],
        [symbol.trim()].filter(f => f)).join('')
    ],
})
export const randomNumber = (min, max) => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}
export const getLeaderboardURL = () => {
    return "https://" + ({
        cat: `leaderboard.popcat.click/`,
        ass: `api.popass.click/leaderboard`,
        pig: `poppig.click/getleadingboard`
    }[POP_MODE] || "")
}
export const getRecaptchaURL = () => {
    const RECAPTCHA = Object.assign({
        SITE_KEY: '',
        SITE_CO_KEY: '',
        SITE_V_KEY: '',
    }, RECAPTCHA_KEYS[POP_MODE.toUpperCase()])
    return `https://recaptcha.net/recaptcha/api2/anchor?ar=1&k=${RECAPTCHA.SITE_KEY}&co=${RECAPTCHA.SITE_CO_KEY}&v=${RECAPTCHA.SITE_V_KEY}&size=invisible`
}
// Please don't ask me why there using xxx, xx, x for initial array, that just generated with same length of the real recaptcha token
export const getFakeCaptchaToken = () => [xxx, xx, x].map(b => crypto.randomBytes(b).toString('base64'))
    .join('').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '')
export const getPopURL = (popOnce, recaptchaToken, t) => {
    const token = t === "" ? "" : `&token=${t}`
    return "https://" + ({
        cat: `stats.popcat.click/pop?pop_count=${popOnce}&captcha_token=${recaptchaToken}${token}`,
        dog: `popdog.click/clicked/v2`,
        ass: `api.popass.click/api/stats?count=${popOnce}&captcha_token=${recaptchaToken}${token}`,
        pig: `poppig.click/submitscore`
    }[POP_MODE] || "")
}
export const diff = (p, n) => ((n || 0) - (p || 0))
export const padNum = (na, l) => [' '.repeat(Math.max(0, l - na[0].toString().length)), na].flat()
const numberFormatPaddingLength = 7
export const padDiff = (c, d) => [padNum(formatNum(c), numberFormatPaddingLength), "+", padNum(formatNum(d), numberFormatPaddingLength)]
// NOTE FOR PUBLIC: We removed some filter for get IP to work
export const getIP = (showLog) => {
    const ip = Object.values(networkInterfaces()).flat().map(i => i.address).filter(i => {
        const isValid = BONGOS_IP.map(n => n.matches(i)).filter(t => t).length == 0
        if (!isValid) {
            showLog && console.log(i, "is not valid IP address as we need")
        }
        return isValid
    })
    showLog && console.log(...["We have", padNum(formatNum(ip.length), MAX_CONNECTIONS.toString().length), "IP addresses"].flat())
    return ip
}
Array.prototype.random = function () {
    return this[Math.floor((Math.random()*this.length))];
}
