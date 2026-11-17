# SolvePath

Learn, solve, and speedcube with any 3x3 puzzle cube, right in your web browser.

SolvePath is a free, open-source web app for families. Point your camera at your cube, pick a goal, and follow easy steps to solve it. Learn new methods one step at a time, and time your solves as you get faster.

**Status:** early development. The project scaffold (milestone M0) is done; the cube itself arrives in M1. See [docs/PLAN.md](docs/PLAN.md) for the full plan.

## Promises

- **No download.** Works in modern browsers on phones, tablets, and computers.
- **Camera video is never recorded, saved, or uploaded.** Each picture is read once, inside your device, then thrown away.
- **No ads, no trackers, no analytics.** Free to use and free to host.
- **Kids' profiles collect no personal information.**

## Run it yourself

You need [Node.js 24](https://nodejs.org/) (see `.nvmrc`).

```sh
npm ci          # install exact dependency versions
npm run dev     # start the app at http://localhost:5173
npm test        # unit tests
npm run build   # build the static site into apps/web/dist
```

- Testing on a phone over your Wi-Fi (the camera needs HTTPS): see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
- Hosting your own copy (static, or with accounts and sync): see [deploy/README.md](deploy/README.md).

## License

Code: [MPL-2.0](LICENSE). Guide and course text: CC BY 4.0. Third-party licenses: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

SolvePath is not affiliated with any cube brand. It works with any 3x3 puzzle cube.
