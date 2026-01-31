import blessed from "blessed";
import WebSocket from "ws";
export async function startTui(opts = {}) {
    const url = opts.url ?? "ws://127.0.0.1:18789/ws";
    const state = {
        url,
        agent: "main",
        session: "main",
        deliver: false,
        model: "default",
        status: "connecting"
    };
    const screen = blessed.screen({ smartCSR: true, title: "OpenGrasp TUI" });
    const header = blessed.box({
        top: 0,
        left: 0,
        height: 1,
        width: "100%",
        tags: true,
        content: "",
        style: { fg: "white", bg: "blue" }
    });
    const log = blessed.log({
        top: 1,
        left: 0,
        height: "80%",
        width: "100%",
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        border: "line"
    });
    const status = blessed.box({
        top: "80%",
        left: 0,
        height: 1,
        width: "100%",
        content: "",
        style: { fg: "yellow" }
    });
    const footer = blessed.box({
        top: "80%+1",
        left: 0,
        height: 1,
        width: "100%",
        content: "",
        style: { fg: "white" }
    });
    const input = blessed.textbox({
        bottom: 0,
        left: 0,
        height: 3,
        width: "100%",
        border: "line",
        inputOnFocus: true
    });
    screen.append(header);
    screen.append(log);
    screen.append(status);
    screen.append(footer);
    screen.append(input);
    input.focus();
    const ws = new WebSocket(state.url, {
        headers: opts.token ? { Authorization: `Bearer ${opts.token}` } : undefined
    });
    ws.on("open", () => {
        state.status = "connected";
        log.log("{green-fg}Connected to gateway{/green-fg}");
        render();
    });
    ws.on("close", () => {
        state.status = "disconnected";
        log.log("{red-fg}Disconnected{/red-fg}");
        render();
    });
    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg.type === "chat") {
                const content = msg.response?.message?.content ?? "(no response)";
                log.log(`{cyan-fg}assistant:{/cyan-fg} ${content}`);
            }
            else if (msg.type === "error") {
                log.log(`{red-fg}error:{/red-fg} ${msg.error}`);
            }
        }
        catch {
            log.log(`{red-fg}error:{/red-fg} invalid message`);
        }
        render();
    });
    input.on("submit", (value) => {
        const text = String(value ?? "").trim();
        input.clearValue();
        input.focus();
        if (!text)
            return;
        if (text.startsWith("/")) {
            handleSlash(text.slice(1));
            render();
            screen.render();
            return;
        }
        log.log(`{white-fg}you:{/white-fg} ${text}`);
        if (state.status === "connected") {
            ws.send(JSON.stringify({
                type: "chat",
                message: text,
                agent: state.agent,
                session: state.session,
                deliver: state.deliver
            }));
        }
        else {
            log.log("{red-fg}not connected{/red-fg}");
        }
        render();
        screen.render();
    });
    function handleSlash(raw) {
        const [cmd, ...rest] = raw.split(" ");
        switch (cmd) {
            case "help":
                log.log("/status /agent <id> /session <key> /model <ref> /deliver <on|off> /new /reset /abort /exit");
                break;
            case "status":
                log.log(`status: ${state.status}`);
                break;
            case "agent":
                if (rest[0])
                    state.agent = rest[0];
                log.log(`agent: ${state.agent}`);
                break;
            case "session":
                if (rest[0])
                    state.session = rest[0];
                log.log(`session: ${state.session}`);
                break;
            case "model":
                if (rest[0])
                    state.model = rest[0];
                log.log(`model: ${state.model}`);
                break;
            case "deliver":
                state.deliver = rest[0] === "on";
                log.log(`deliver: ${state.deliver ? "on" : "off"}`);
                break;
            case "new":
            case "reset":
                state.session = "main";
                log.log("session reset to main");
                break;
            case "abort":
                log.log("abort requested (no-op)");
                break;
            case "settings":
                log.log("settings panel not implemented");
                break;
            case "exit":
                ws.close();
                screen.destroy();
                process.exit(0);
            default:
                log.log(`unknown command: ${cmd}`);
        }
    }
    function render() {
        header.setContent(` URL: ${state.url} | Agent: ${state.agent} | Session: ${state.session} `);
        status.setContent(`Status: ${state.status}`);
        footer.setContent(`Deliver: ${state.deliver ? "on" : "off"} | Model: ${state.model} | Thinking: off | Verbose: off | Reasoning: off`);
    }
    screen.key(["C-c"], () => {
        input.clearValue();
        input.focus();
        screen.render();
    });
    screen.key(["C-d"], () => {
        ws.close();
        screen.destroy();
        process.exit(0);
    });
    screen.key(["escape"], () => {
        log.log("abort requested (no-op)");
        screen.render();
    });
    screen.key(["C-l"], () => {
        log.log("model picker not implemented");
        screen.render();
    });
    screen.key(["C-g"], () => {
        log.log("agent picker not implemented");
        screen.render();
    });
    screen.key(["C-p"], () => {
        log.log("session picker not implemented");
        screen.render();
    });
    screen.key(["C-o"], () => {
        log.log("toggle tool output (no-op)");
        screen.render();
    });
    screen.key(["C-t"], () => {
        log.log("toggle thinking visibility (no-op)");
        screen.render();
    });
    render();
    screen.render();
}
export { runOnboardingTui } from "./onboard.js";
