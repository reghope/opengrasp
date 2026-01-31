type TuiOptions = {
    url?: string;
    token?: string;
};
export declare function startTui(opts?: TuiOptions): Promise<void>;
export { runOnboardingTui } from "./onboard.js";
