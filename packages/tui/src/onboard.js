import blessed from "blessed";
const DEFAULT_WORKSPACE = "~/.opengrasp/workspace";
const DEFAULT_PROVIDERS = ["anthropic", "openai-codex", "kimi"];
function normalizeProvider(input) {
    const value = input.trim().toLowerCase();
    if (value === "codex" || value === "openai-codex" || value === "openai")
        return "openai-codex";
    if (value === "anthropic")
        return "anthropic";
    if (value === "kimi")
        return "kimi";
    if (value === "openrouter")
        return "openrouter";
    if (value === "gemini" || value === "google")
        return "gemini";
    if (value === "minimax")
        return "minimax";
    if (value === "moonshot")
        return "moonshot";
    if (value === "venice")
        return "venice";
    if (value === "zai" || value === "z.ai")
        return "zai";
    if (value === "local")
        return "local";
    return null;
}
export async function runOnboardingTui(defaults = {}) {
    const screen = blessed.screen({ smartCSR: true, title: "OpenGrasp Onboarding" });
    const panel = blessed.box({
        top: "center",
        left: "center",
        width: "80%",
        height: "80%",
        border: "line",
        label: " OpenGrasp Onboarding ",
        padding: { top: 1, left: 2, right: 2 }
    });
    const output = blessed.log({
        top: 0,
        left: 0,
        width: "100%",
        height: "70%",
        tags: true,
        scrollable: true
    });
    const prompt = blessed.textbox({
        bottom: 0,
        left: 0,
        width: "100%",
        height: 3,
        border: "line",
        inputOnFocus: true
    });
    panel.append(output);
    panel.append(prompt);
    screen.append(panel);
    const ask = (question, opts) => new Promise((resolve) => {
        output.log(`{bold}${question}{/bold}`);
        if (opts?.defaultValue) {
            output.log(`{gray}default: ${opts.defaultValue}{/gray}`);
        }
        prompt.secret = Boolean(opts?.secret);
        prompt.setValue("");
        prompt.focus();
        screen.render();
        prompt.readInput((_, value) => {
            const trimmed = String(value ?? "").trim();
            resolve(trimmed || opts?.defaultValue || "");
        });
    });
    const yesNo = async (question, defaultYes = true) => {
        const suffix = defaultYes ? "[Y/n]" : "[y/N]";
        const answer = (await ask(`${question} ${suffix}`)).toLowerCase();
        if (!answer)
            return defaultYes;
        return answer.startsWith("y");
    };
    output.log("Welcome to OpenGrasp onboarding.");
    output.log("Flow: existing config → auth → workspace → gateway → channels → daemon → health → skills.");
    if (defaults.configExists) {
        const choice = await ask("Existing config found: keep / modify / reset?", {
            defaultValue: "modify"
        });
        const normalized = choice.trim().toLowerCase();
        if (normalized.startsWith("keep")) {
            screen.destroy();
            return {
                action: "keep",
                workspace: defaults.workspace ?? DEFAULT_WORKSPACE,
                providers: defaults.providers ?? DEFAULT_PROVIDERS,
                authEntries: [],
                gateway: {
                    port: defaults.gateway?.port ?? 18789,
                    bind: defaults.gateway?.bind ?? "127.0.0.1",
                    authMode: defaults.gateway?.authMode ?? "token"
                }
            };
        }
    }
    const mode = await ask("Setup mode: quick or advanced?", { defaultValue: "quick" });
    const isAdvanced = mode.trim().toLowerCase().startsWith("adv");
    output.log("{bold}Auth{/bold}");
    const providerSeed = defaults.providers ?? DEFAULT_PROVIDERS;
    const providers = [];
    for (const provider of providerSeed) {
        const enable = await yesNo(`Enable ${provider} auth?`, true);
        if (enable)
            providers.push(provider);
    }
    const extraProvider = await ask("Add another provider? (enter name or leave blank)");
    if (extraProvider) {
        const normalized = normalizeProvider(extraProvider);
        if (normalized && !providers.includes(normalized))
            providers.push(normalized);
    }
    const authEntries = [];
    for (const provider of providers) {
        const authType = (await ask(`Auth type for ${provider} (api/oauth/skip)?`, { defaultValue: "api" }));
        if (authType === "skip")
            continue;
        if (authType === "oauth") {
            const access = await ask("OAuth access token:", { secret: true });
            const refresh = await ask("OAuth refresh token:", { secret: true });
            const email = await ask("Account email (optional):");
            authEntries.push({ provider, type: "oauth", access, refresh, email: email || undefined });
        }
        else {
            const key = await ask("API key:", { secret: true });
            const email = await ask("Account email (optional):");
            if (key)
                authEntries.push({ provider, type: "api_key", key, email: email || undefined });
        }
    }
    output.log("{bold}Workspace{/bold}");
    const workspace = await ask("Workspace path?", {
        defaultValue: defaults.workspace ?? DEFAULT_WORKSPACE
    });
    output.log("{bold}Gateway{/bold}");
    const gatewayPort = isAdvanced
        ? Number(await ask("Gateway port?", { defaultValue: String(defaults.gateway?.port ?? 18789) }))
        : defaults.gateway?.port ?? 18789;
    const gatewayBind = isAdvanced
        ? await ask("Gateway bind?", { defaultValue: defaults.gateway?.bind ?? "127.0.0.1" })
        : defaults.gateway?.bind ?? "127.0.0.1";
    const gatewayAuthMode = isAdvanced
        ? (await ask("Gateway auth mode (token/password/none)?", { defaultValue: "token" }))
        : defaults.gateway?.authMode ?? "token";
    output.log("{bold}Channels{/bold}");
    output.log("Channels setup not implemented yet; skipping.");
    output.log("{bold}Daemon{/bold}");
    output.log("Daemon install not implemented yet; skipping.");
    output.log("{bold}Health check{/bold}");
    output.log("Health check not implemented yet; skipping.");
    output.log("{bold}Skills{/bold}");
    output.log("Skills install not implemented yet; skipping.");
    output.log("Summary:");
    output.log(`Workspace: ${workspace}`);
    output.log(`Providers: ${providers.join(", ") || "none"}`);
    output.log(`Auth entries: ${authEntries.length}`);
    output.log(`Gateway: ${gatewayBind}:${gatewayPort} (${gatewayAuthMode})`);
    const proceed = await yesNo("Continue and write config?", true);
    screen.destroy();
    if (!proceed) {
        process.exit(1);
    }
    return {
        action: "write",
        workspace,
        providers,
        authEntries,
        gateway: {
            port: gatewayPort,
            bind: gatewayBind,
            authMode: gatewayAuthMode
        }
    };
}
