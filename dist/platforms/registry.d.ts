/**
 * Vereinheitliche hier die Methoden-Namen mit deinen Services.
 * Ich nehme an, beide Clients exportieren z.B. sendPost / sendScheduled / health.
 */
export const registry: {
    [PLATFORMS.BLUESKY]: {
        sendPost: any;
        sendScheduled: any;
        health: any;
    };
    [PLATFORMS.MASTODON]: {
        sendPost: any;
        sendScheduled: any;
        health: any;
    };
};
export { PLATFORMS };
