# NOTE: THIS IS THE PUBLIC VERSION OF DEMO CODE, WHICH HAS BEEN REMOVED SOME CODE FOR HIGHER HIT RATE, AND THOSE CODE MIGHT BE ILLEGAL OPERATIONS JUDGE BY CDN COMPANY

## We were remove following purpose code, and those were keypoint:

- CDN human-check bypass
- Environment Initializing (all shell scripts)
- User-Agnet strings
- Copied of recaptcha site key and certificates and action key
- Some README contents which contains the key features that we used for higher hit rate
  - Some `Environment Prepareation` section

# popcat-dashboard
A popcat bot and prometheus exporter

## Introduction

This project using some magic for generate thousand and more computer power in a single server

You might to see this [document](https://hackmd.io/@seadog007/popcat) first to known the basis of popcat, and you need to know some networking technology to generate that power to pop the cat

![](https://i.imgur.com/Nj6DlIN.jpg)

![](https://i.imgur.com/AEjj3vX.jpg)

## How to use

### Environment Prepareation

1. Clone this project
2. Use `npm i` to install packages

### Just want a bot click

1. Just run `./popcat.mjs`
2. You can trying to setting following environment for adjust the pop bot

### Leaderboard Prometheus Exporter

1. Just run `./leaderboard-exporter.mjs`

## For Experts

### Environment Variables

|              ENV               | Default | Descriotion                                                                                                    |
|--------------------------------|--------:|----------------------------------------------------------------------------------------------------------------|
| `DEBUG`                        | `false` | Use `true` to enable Debug logging mode                                                                        |
| `POP_MODE`                     |   `cat` | Use `dog`, `ass`, `pig` to enable `popdog.click` or `popass.click` mode                                        |
| `DOG_UUID`                     | `empty` | Reuse a valid UUID to perform large count in daily leaderboard                                                 |
| `DOG_NAME`                     | `empty` | The Display name on popdog leaderboard                                                                         |
| `MAX_CONNECTIONS`              |   `300` | Parallels connections, don't setting too large                                                                 |
| `MINIMUM_COLDDOWN_TIME_PER_IP` |    `35` | Colddown time, too small will hit `429` rate limit, `POP_MODE` in `dog` is `9`, `ass` is `120`, `pig` is `10`  |
| `LOGGER_INTERVAL`              |     `1` | Statics print on console interval in second(s)                                                                 |
| `SPAWN_RATE_MS`                |    `50` | Time interval between each job spawn, `POP_MODE = ass` is `1000`                                               |
| `REFRESH_IP_LIST_INTERVAL`     |    `30` | Wait for second(s) and watch system IP addresses changes after a batch initialized                             |
| `RANDOM_LOWER`                 |   `650` | The Bottom of random for Popcount, minimum is `1`, `POP_MODE` in `dog` is `1800`, `ass` is `750`               |
| `RANDOM_UPPER`                 |   `799` | The Top of random for Popcount, maximum is `800`, `POP_MODE` in `dog` is `2000`, `ass` is `1000`               |
| `USE_REAL_RECAPTCHA`           | `false` | Use `true` to uses real recaptcha token instead of fake generater                                              |

### Prometheus Exporters

* Default exporter is exposes at `http://<host>:<port>/metrics`
* We have collected all of ours bot statics for [popcat](https://grafana.tipsy.coffee/d/ZpkMi6Gnz/popcat-click), [popass](https://grafana.tipsy.coffee/d/xMYU6cn7z/popass-click) and [poppig](https://grafana.tipsy.coffee/d/w4rLph77k/poppig-click)

| `POP_MODE` | leaderboard | Port |
|:----------:|:-----------:|-----:|
|    `cat`   |     `no`    | 9464 |
|    `dog`   |     `no`    | 9465 |
|    `ass`   |     `no`    | 9466 |
|    `pig`   |     `no`    | 9467 |
|    `cat`   |    `yes`    | 8464 |
|    `dog`   |    `yes`    | 8465 |
|    `ass`   |    `yes`    | 8466 |
|    `pig`   |    `yes`    | 8467 |

## Credit

Special thanks and sorry for [@PopCatClick](https://twitter.com/PopCatClick), [@onfe1](https://twitter.com/onfe1) and [@aamelaii](https://twitter.com/aamelaii), [they was paid for immense sacrifices on server cost and time wasted](https://twitter.com/onfe1/status/1425844359338016778)

Thanks @seadog007 was drunk with only two venti cups of tea then wrote [this topic](https://forum.gamer.com.tw/Co.php?bsn=60076&sn=76750789&subbsn=1&bPage=0), the first version of the bot, then introduce this game to us and provide manys feedback for test, code review ~~, air and water~~

Also, thanks ours team members.

## Acknowledgments

This project is a manually fork with my modification which was received first version of source from @james58899 in ours group chat, and he also opened a [repo](https://github.com/james58899/popcat_clicker) but that was his optimized version, and @ptc0219 fork that and optimized again at [here](https://github.com/ptc0219/coscat) for popcat version, and [here](https://github.com/ptc0219/popdog) is popdog version. (NOTE: all of repos might be private, so I just left a link here)

## Disclaimer

This project is a research to prove that Cloudflare limitation can be bypass and set non-human check is meaningless, you can using this bot tool for fun, but it might cause your ISP blocking your internet accessibility, please don't generate too huge traffic, that means you are doing a DDoS attack, that is not for fun.

Also, we do not responsible for any illegal or damage of your personal assets including your computer and network.

## License

See [LICENSE](blob/main/LICENSE) file
