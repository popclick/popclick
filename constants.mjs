'use strict';

import { getMatch, IPMatch, IPSubnetwork, IPRange, matches } from 'ip-matching'

export const DEBUG = Object.assign([false], [(process.env.DEBUG || "").match(/^(true|t|1|yes|y)$/i) != null].filter(f => f)).valueOf().pop()
export const POP_MODE = Object.assign([false], [(process.env.POP_MODE || "cat").toLowerCase()].filter(f => f)).valueOf().pop()
export const EXPORTER_PORT = ({ cat: 9464, dog: 9465, ass: 9466, pig: 9467 }[POP_MODE]) || 9463
export const DOG_UUID = Object.assign([""], [process.env.DOG_UUID].filter(f => f)).valueOf().pop()
export const DOG_NAME = Object.assign([""], [process.env.DOG_NAME].filter(f => f)).valueOf().pop()
export const MAX_CONNECTIONS = Object.assign([300], [process.env.MAX_CONNECTIONS].filter(f => f)).valueOf().pop()
export const MINIMUM_COLDDOWN_TIME_PER_IP = Object.assign([{ cat: 35, dog: 9, ass: 120, pig: 10 }[POP_MODE] || 35], [process.env.MINIMUM_COLDDOWN_TIME_PER_IP].filter(f => f)).valueOf().pop() * 1000
export const LOGGER_INTERVAL = Object.assign([1], [process.env.LOGGER_INTERVAL].filter(f => f)).valueOf().pop() * 1000
export const SPAWN_RATE_MS = Object.assign([{ cat: 50, dog: 50, ass: 1000, pig: 50 }[POP_MODE] || 50], [process.env.SPAWN_RATE_MS].filter(f => f)).valueOf().pop()
export const REFRESH_IP_LIST_INTERVAL = Object.assign([30], [process.env.REFRESH_IP_LIST_INTERVAL].filter(f => f)).valueOf().pop() * 1000
const RANDOM_BORDER = {
    cat: {
        LOWER: 650,
        UPPER: 799,
    },
    dog: {
        LOWER: 1800,
        UPPER: 2000,
    },
    ass: {
        LOWER: 750,
        UPPER: 1000,
    },
    pig: {
        LOWER: 650,
        UPPER: 799,
    },
}
export const RANDOM_LOWER = Object.assign([RANDOM_BORDER[POP_MODE].LOWER], [process.env.RANDOM_LOWER].filter(f => f)).valueOf().pop()
export const RANDOM_UPPER = Object.assign([RANDOM_BORDER[POP_MODE].UPPER], [process.env.RANDOM_UPPER].filter(f => f)).valueOf().pop()
// default is don't use, because all of them never verify that token is invalid, and we will generate a fake one, which is very similar with real one in server access log
export const USE_REAL_RECAPTCHA = Object.assign([false], [(process.env.USE_REAL_RECAPTCHA || "").match(/^(true|t|1|yes|y)$/i) != null].filter(f => f)).valueOf().pop()
// All copy from their site requests
export const RECAPTCHA_KEYS = {
    POPCAT: {
        SITE_KEY: '',
        SITE_CO_KEY: '',
        SITE_V_KEY: '',
    },
    POPASS: {
        SITE_KEY: '',
        SITE_CO_KEY: '',
        SITE_V_KEY: '',
    },
}
// Magic User Agent for higher pass rate ?
export const HEADERS = {
    "User-Agent": "",
}
export const BONGOS_IP = [
    '::/128',
    '::1/128',
    'fe80::/10',
    'fc00::/7',
    'ff00::/8',
    'ff02::1:ff00/104',
    '::ffff:0.0.0.0/96',
    '2001:10::/28',
    '2001:db8::/32',
    '::/96',
    'fec0::/10',
    '0.0.0.0/8',
    '127.0.0.0/24',
    '224.0.0.0/7',
].map(r => getMatch(r))
// Popdog server using Let's Encrypt Certificate, some of computer doesn't have the newer CA will cause leaf verification failed
POP_MODE.match(/dog/i) && (process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0')
