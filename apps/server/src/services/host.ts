import config from "./config.js";

function getHost() {
    const envHost = process.env.TRILIUM_HOST;
    if (envHost) {
        return envHost;
    }

    return config["Network"]["host"] || "0.0.0.0";
}

export default getHost();
