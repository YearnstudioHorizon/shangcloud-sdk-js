export class NotInitializedError extends Error {
    constructor() {
        super("Not initialized.");
    }
}