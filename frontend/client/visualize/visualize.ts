import "../bootstrap.scss";
import "bootstrap";
import { render } from "./app";
import { getDockingTaskContent } from "./dockingTask";

async function main() {
    const queryParameters = new URLSearchParams(window.location.search);
    const type = queryParameters.get("type");
    const taskHash = queryParameters.get("hash");
    const id = queryParameters.get("id");
    const database = queryParameters.get("database");

    if (type === null || taskHash === null || id === null || database === null) {
        render({ type: "unknown", data: "Incomplete data." });
        return;
    }

    if (taskHash === "custom") {
        // TODO: handle custom task definition
        // this means that the user may include the task parameters in the headers
        render({ type: "unknown", data: "Custom task not yet implemented." });
        return;
    }

    const receivedData = await getData(type, id, database, taskHash);
    render({ type: type, data: receivedData });
}

async function getData(type: string, id: string, database: string, hash: string) {
    switch (type) {
        case "docking":
            return await getDockingTaskContent(type, id, database, hash);
        default:
            return "Unknown type";
    }
}

main();
