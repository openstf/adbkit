# Changelog

## 4.2.1 (2026-11-26)

* fix(tcpusb): ack A_WRTE only after the device side took the bytes by @dlstjd0237 in https://github.com/DeviceFarmer/adbkit/pull/600
* fix(tcpusb): flow control on client writes (reverse acks, write limit, early writes) by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/601

### New Contributors

* @dlstjd0237 made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/600

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v4.2.0...v4.2.1

## 4.2.0 (2026-11-23)

* Ship the full Apache-2.0 text in LICENSE and move notices to NOTICE by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/591
* feat(shell): let shell() take an AbortSignal by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/590
* docs: fix JSDoc descriptions copied from other methods by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/592
* feat(client): add client.pair() for wireless debugging by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/593
* fix(shell): keep the abort listener after the caller ends its side by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/594
* feat(install): let install() and installRemote() take pm install flags by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/595
* Bump the dev-dependencies group with 3 updates by @dependabot[bot] in https://github.com/DeviceFarmer/adbkit/pull/596
* Bump commander from 15.0.0 to 15.1.0 by @dependabot[bot] in https://github.com/DeviceFarmer/adbkit/pull/597
* fix(install): make InstallError.code the reason code alone, and quote the apk path with '!' by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/598

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v4.1.0...v4.2.0

## 4.1.0 (2026-11-07)

* Bump the dev-dependencies group with 2 updates by @dependabot[bot] in https://github.com/DeviceFarmer/adbkit/pull/577
* fix(sync): emit 'error' then 'close', not 'end', when a pull or push fails by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/579
* fix(types): ship @types/node-forge so consumers' type checks pass by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/581
* fix(devices): parse devices -l fields by key, not by position by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/582
* fix(tcpip): resolve tcpip() and usb() unless adbd replies with an error by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/583
* feat(reboot): let reboot() take a target such as bootloader or recovery by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/584
* docs: drop the Chrome ADB extension from the README by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/585
* fix: let ES modules on Node 22 import { Adb } and the other classes by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/586
* chore(deps): bump node-forge to 1.4.2 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/587
* Bump node-forge from 1.4.2 to 1.4.3 by @dependabot[bot] in https://github.com/DeviceFarmer/adbkit/pull/578
* Force patched minimatch and glob in dev dependencies by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/588

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v4.0.1...v4.1.0

## 4.0.1 (2026-11-01)

* Bump typescript-eslint from 8.72.0 to 8.72.1 in the dev-dependencies group by @dependabot[bot] in https://github.com/DeviceFarmer/adbkit/pull/572
* feat(forward): resolve tcp:0 ports, remove forwards, and close leaked sockets by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/574
* fix(sync): wait for 'drain' when pushing to a slow device by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/575

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v4.0.0...v4.0.1

## 4.0.0 (2026-10-25)

* Support adb reverse through the TcpUsb bridge by @jozenstar in https://github.com/DeviceFarmer/adbkit/pull/550
* Raise the TcpUsb bridge's max payload to 1 MiB by @jozenstar in https://github.com/DeviceFarmer/adbkit/pull/551
* Support adb's delayed_ack in the TcpUsb bridge by @jozenstar in https://github.com/DeviceFarmer/adbkit/pull/552
* Don't crash the TcpUsb bridge on a signature no known key verifies by @jozenstar in https://github.com/DeviceFarmer/adbkit/pull/554
* Bump mocha from 10.2.0 to 12.0.3 by @dependabot[bot] in https://github.com/DeviceFarmer/adbkit/pull/556
* feat!: native promises, package exports, ESLint 10 and Node 22 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/567
* Bump debug from 4.3.7 to 4.4.3 by @dependabot[bot] in https://github.com/DeviceFarmer/adbkit/pull/561
* chore(deps): move to adbkit-logcat 3 and adbkit-monkey 2 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/568
* fix(tcpusb): check AUTH signatures strictly with OpenSSL by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/570

### New Contributors

* @jozenstar made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/550

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.3.9...v4.0.0

## 3.3.9 (2026-07-08)

* Update OS image from Ubuntu 20.04 to 22.04 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/546
* Update OS image from Ubuntu 20.04 to 22.04 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/549
* Fix bug that leaves dangling connections by @pimterry in https://github.com/DeviceFarmer/adbkit/pull/548

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.3.8...v3.3.9

## 3.3.8 (2024-11-20)

* Allow authorization of known public keys in the tcp usb bridge by @YishaiYosifov in https://github.com/DeviceFarmer/adbkit/pull/540
* Update version to 3.3.8 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/541

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.3.7...v3.3.8

## 3.3.7 (2024-11-14)

* It fixes a bug on stats with nodeJS 22.11.0 version and higher by @denis99999 in https://github.com/DeviceFarmer/adbkit/pull/538
* Update version to 3.3.7 by @denis99999 in https://github.com/DeviceFarmer/adbkit/pull/539

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.3.6...v3.3.7

## 2.11.3 (2024-11-14)

* [Security] Bump node-forge from 0.9.2 to 0.10.0 by @dependabot-preview in https://github.com/DeviceFarmer/adbkit/pull/28
* Bump version to 2.11.3 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/30

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v2.11.2...v2.11.3

## 3.3.6 (2024-10-14)

* Update CI machine image to ubuntu2004 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/532
* Skip before hook in sync tests if no devices by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/533
* Fix leaked promise in pull by @dfriederich in https://github.com/DeviceFarmer/adbkit/pull/530
* Fix running Hardware tests by @dfriederich in https://github.com/DeviceFarmer/adbkit/pull/531
* Add attach / detach commands by @YishaiYosifov in https://github.com/DeviceFarmer/adbkit/pull/534
* Update version to 3.3.6 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/535

### New Contributors

* @dfriederich made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/530
* @YishaiYosifov made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/534

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.2.6...v3.3.6

## 3.2.6 (2024-01-18)

* Bump prettier from 2.8.8 to 3.0.2 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/471
* Bump eslint-config-prettier from 8.10.0 to 9.0.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/474
* Bump eslint-plugin-prettier from 4.2.1 to 5.0.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/472
* Throw error if DELETE_FAILED_DEVICE_POLICY_MANAGER is sent by @tburakdemir in https://github.com/DeviceFarmer/adbkit/pull/513
* Update version to 3.2.6 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/525

### New Contributors

* @tburakdemir made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/513

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.2.5...v3.2.6

## 3.2.5 (2023-06-23)

* Allow all streams in client.push() & client.install() types, not just FS streams by @pimterry in https://github.com/DeviceFarmer/adbkit/pull/436
* Include 'unauthorized' in the possible device states type by @pimterry in https://github.com/DeviceFarmer/adbkit/pull/437
* fix unhandled rejection when installing apk by @bambloo in https://github.com/DeviceFarmer/adbkit/pull/446
* Update node.js to 16 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/465

### New Contributors

* @bambloo made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/446

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.2.4...v3.2.5

## 3.2.4 (2023-03-30)

* Add support for socket timeouts by @a1rwulf in https://github.com/DeviceFarmer/adbkit/pull/303
* Fix adb disconnect always throwing an error by @a1rwulf in https://github.com/DeviceFarmer/adbkit/pull/302
* Fixed wrong extra flag for type float by @Jaid in https://github.com/DeviceFarmer/adbkit/pull/312
* Add partial adb STA2 command implementation by @sunjw in https://github.com/DeviceFarmer/adbkit/pull/277
* Bump @typescript-eslint/eslint-plugin from 4.33.0 to 5.44.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/383
* Bump sinon from 13.0.2 to 14.0.2 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/381
* Bump @types/mocha from 9.1.1 to 10.0.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/357
* Bump sinon from 14.0.2 to 15.0.1 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/396
* Bump @typescript-eslint/parser from 4.33.0 to 5.48.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/402
* Install exception handling. Cleanup after install command. by @DonVietnam in https://github.com/DeviceFarmer/adbkit/pull/403
* change source path in bin for correct work cli commands by @gmanru in https://github.com/DeviceFarmer/adbkit/pull/410
* Bump @types/node from 14.18.42 to 18.15.11 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/434
* Bump typescript from 4.9.5 to 5.0.2 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/427
* Bump mocha from 8.3.2 to 10.2.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/394
* Try to fix memory leak in _readData. by @sunjw in https://github.com/DeviceFarmer/adbkit/pull/315
* Release 3.2.4 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/435

### New Contributors

* @a1rwulf made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/303
* @Jaid made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/312
* @sunjw made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/277
* @DonVietnam made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/403
* @gmanru made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/410

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.2.3...v3.2.4

## 3.2.3 (2022-05-04)

* Add missing exports by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/286
* Fix authentication check in https://github.com/DeviceFarmer/adbkit/issues/42

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.2.2...v3.2.3

## 3.2.2 (2022-04-20)

* Default to IPv4 localhost for Node 17 compatibility by @pimterry in https://github.com/DeviceFarmer/adbkit/pull/214
* Bump ts-node from 9.1.1 to 10.4.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/195
* Bump @types/mocha from 8.2.3 to 9.0.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/145
* Fixup TypeScript error for test by @jonathanKingston in https://github.com/DeviceFarmer/adbkit/pull/269
* Update commander by @jonathanKingston in https://github.com/DeviceFarmer/adbkit/pull/270
* Bump @types/node-forge from 0.10.10 to 1.0.1 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/257
* Bump node-forge from 0.10.0 to 1.3.1 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/268
* Bump sinon from 9.2.4 to 13.0.1 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/246
* Bump eslint from 7.32.0 to 8.12.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/267
* Release 3.2.2 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/276

### New Contributors

* @jonathanKingston made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/269

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.2.1...v3.2.2

## 3.2.1 (2022-01-12)

* Upgrade to GitHub-native Dependabot by @dependabot-preview in https://github.com/DeviceFarmer/adbkit/pull/105
* avoid chunk is undefined. by @rcpirate in https://github.com/DeviceFarmer/adbkit/pull/127
* Bump sinon-chai from 3.5.0 to 3.7.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/115
* Bump @types/node-forge from 0.9.10 to 0.10.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/124
* Bump eslint-plugin-prettier from 3.4.1 to 4.0.0 by @dependabot in https://github.com/DeviceFarmer/adbkit/pull/167
* Update adbkit-monkey dependency version to 1.2.0 by @koral-- in https://github.com/DeviceFarmer/adbkit/pull/179

### New Contributors

* @rcpirate made their first contribution in https://github.com/DeviceFarmer/adbkit/pull/127

**Full Changelog**: https://github.com/DeviceFarmer/adbkit/compare/v3.2.0...v3.2.1

## 3.2.0 (2021-03-09)

* Dependency version updates
* Wait for device command update (#83)
* Extend original `getPackages` method, keep compatibility (#61)
* Showcase long-running shell commands (#59)
* Add 'client.getPackagesWithFlags' for flags in 'pm list packages' (#56)
* Code cleanup (#38)
* Extend adb keycodes (#27)
* Rewrite to TypeScript (#31)
* Many thanks to @drauggresh

