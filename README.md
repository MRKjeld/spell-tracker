# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Sharing your local dev server over the internet (Pinggy)

Use this when you want someone off your network (e.g. at the table) to open the app on their own device.

1. **Start the dev server:**
   ```sh
   npm run dev
   ```
   Vite defaults to `http://localhost:5173`, but if that port is busy it'll pick the next free one (e.g. `5174`) — check the terminal output for the actual port and use it below.

2. **Open a Pinggy tunnel to that port** (in a separate terminal, keep it running):
   ```sh
   ssh -p 443 -R0:localhost:5174 free.pinggy.io
   ```
   Replace `5174` with whatever port Vite printed. Pinggy will print a public `https://...pinggy.link` URL — share that.

   - The tunnel only lasts as long as this SSH session is open (free tier sessions also auto-expire after ~60 minutes — just rerun the command to get a new URL).
   - If port 443 is blocked too, try `-p 443` with hostname `a.pinggy.io` instead of `free.pinggy.io`, or see [pinggy.io/docs](https://pinggy.io/docs/) for other connection options.

3. **If you get `ssh: Could not resolve hostname free.pinggy.io`:**
   This means the machine can't resolve/reach Pinggy's SSH endpoint — commonly caused by a work VPN that filters DNS or blocks non-standard outbound traffic.
   - Try disconnecting the VPN (or adding a split-tunnel exception for `pinggy.io`) and re-run the `ssh` command.
   - Confirm basic DNS works first: `nslookup free.pinggy.io` — if that resolves but `ssh` still fails, the VPN is likely blocking the outbound SSH connection specifically (try from a non-VPN network, e.g. phone hotspot, to confirm).
   - As a fallback, any other tunneling tool (e.g. `ngrok http 5174`, `cloudflared tunnel --url http://localhost:5174`) works the same way — point it at whatever port Vite is running on.

