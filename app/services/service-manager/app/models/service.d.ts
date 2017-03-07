export interface Service {
    host: string;
    port: number;
    name: string;
    state?: string;
    routingPath: string;
    apiPath: string;
}