import "../bootstrap.scss";
import "bootstrap";
import { render } from "./app";
import { getDockingTaskContent } from "./docking/main";
import { getTunnelsTaskContent } from "./tunnels/main";

async function main() {
    const queryParameters = new URLSearchParams(window.location.search);
    const type = queryParameters.get("type");
    const taskHash = queryParameters.get("hash");
    const id = queryParameters.get("id");
    const database = queryParameters.get("database");
    const structureName = queryParameters.get("structureName");

    if (type === null || taskHash === null || id === null || database === null || structureName === null) {
        render({ type: "unknown", data: "Incomplete data." });
        return;
    }

    const receivedData = await getData(type, id, database, taskHash, structureName);
    render({ type: type, data: receivedData });
}

async function getData(type: string, id: string, database: string, hash: string, structureName: string) {
    switch (type) {
        case "docking":
            return await getDockingTaskContent(id, database, hash, structureName);
        case "tunnels":
            return await getTunnelsTaskContent(id, database, hash, structureName);
        default:
            return "Unknown type";
    }
}

main();
