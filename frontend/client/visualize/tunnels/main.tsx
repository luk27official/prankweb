import React, { useEffect } from "react";

import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { loadStructureIntoMolstar, setStructureTransparency, updatePolymerView, createPocketsGroupFromJson, showPocketInCurrentRepresentation } from "../../viewer/molstar-visualise";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { getApiEndpoint } from "../../prankweb-api";
import { TunnelData, TunnelsTaskProps } from "./types";
import { StateObjectSelector } from "molstar/lib/mol-state";
import { PolymerRepresentation, PolymerViewType, PocketData, PredictionData, PocketRepresentation, PocketsViewType } from "../../custom-types";
import { TunnelsTaskVisualizationBox } from "./visualization-box";
import { TunnelsTaskRightPanel } from "./right-panel";
import { Color } from "molstar/lib/mol-util/color";

export function TunnelsTask(tp: TunnelsTaskProps) {
    const [plugin, setPlugin] = React.useState<PluginUIContext | undefined>(undefined);
    const [tunnelsData, setTunnelsData] = React.useState<TunnelData[]>([]);
    const [polymerRepresentations, setPolymerRepresentations] = React.useState<PolymerRepresentation[]>([]);
    const [tunnelRepresentations, setTunnelRepresentations] = React.useState<StateObjectSelector[]>([]);
    const [visibleTunnels, setVisibleTunnels] = React.useState<number[]>([1]);
    const [pocket, setPocket] = React.useState<PocketData | undefined>(undefined);
    const [pocketRank, setPocketRank] = React.useState<string>("");
    const [prediction, setPrediction] = React.useState<PredictionData | undefined>(undefined);
    const [pocketRepresentations, setPocketRepresentations] = React.useState<PocketRepresentation[]>([]);
    const [pocketsView, setPocketsView] = React.useState<PocketsViewType>(PocketsViewType.Ball_Stick_Residues_Color);

    useEffect(() => {
        const loadPlugin = async () => {
            const plugin: PluginUIContext = await createMolstarViewer();
            setPlugin(plugin);

            // If the plugin is maximized, hide the React components
            plugin.layout.events.updated.subscribe(() => {
                const contentWrapper = document.getElementById('content-wrapper')!;
                const visualizationToolbox = document.getElementById('visualization-toolbox')!;
                const tooltip = document.getElementById('visualization-tooltip')!;

                contentWrapper.style.display = plugin.layout.state.isExpanded ? "none" : "block";
                visualizationToolbox.style.display = plugin.layout.state.isExpanded ? "none" : "block";
                tooltip.style.display = plugin.layout.state.isExpanded ? "none" : "block";
            });

            const baseUrl: string = getApiEndpoint(tp.database, tp.id) + "/public";

            // Download and load the structure
            const molData = await loadStructureIntoMolstar(plugin, `${baseUrl}/${tp.structureName}`, 1, "0x0000ff");
            const polymerRepresentations = molData[2] as PolymerRepresentation[];
            setPolymerRepresentations(polymerRepresentations);

            updatePolymerView(PolymerViewType.Cartoon, plugin, polymerRepresentations, [], false);
            setStructureTransparency(plugin, 0.5, polymerRepresentations);

            await loadPocketData(plugin, molData[1] as StateObjectSelector, tp);

            await loadTunnelsData(plugin, tp);
        };

        loadPlugin();
    }, []);

    const loadPocketData = async (plugin: PluginUIContext, structure: StateObjectSelector, tp: TunnelsTaskProps) => {
        try {
            const baseUrl: string = getApiEndpoint(tp.database, tp.id) + "/public";
            const prediction: PredictionData = await fetch(`${baseUrl}/prediction.json`).then(res => res.json()).catch(err => console.log(err));
            setPrediction(prediction);

            // Get pocket rank from task data
            const apiEndpoint: string = getApiEndpoint(tp.database, tp.id, "tunnels");
            const tunnelsTasks = await fetch(`${apiEndpoint}/tasks`).then(res => res.json()).catch(err => console.log(err));

            let pocketRank: string | undefined = undefined;
            tunnelsTasks["tasks"].forEach((task: any) => {
                if (task["initialData"]["hash"] === tp.hash) {
                    pocketRank = task["initialData"]["pocket"]["rank"];
                    return;
                }
            });

            if (!pocketRank) return;

            setPocketRank(pocketRank);

            const pocket = prediction.pockets.find((pocket: PocketData) => pocket.rank === pocketRank);
            if (!pocket) return;
            pocket.color = "c7c7c7";
            setPocket(pocket);

            const builder = plugin.state.data.build();
            const pocketReps = await createPocketsGroupFromJson(plugin, structure, "Pockets", prediction, 1, false);
            setPocketRepresentations(pocketReps);

            await builder.commit();

            prediction.pockets.forEach((p: PocketData, idx: number) => {
                showPocketInCurrentRepresentation(plugin, pocketsView, pocketReps, idx, p.rank === pocketRank);
            });
        } catch (error) {
            console.error("Error loading pocket data:", error);
        }
    };

    const loadTunnelsData = async (plugin: PluginUIContext, tp: TunnelsTaskProps) => {
        try {
            // Extract tunnels from the data.json
            const tunnels: TunnelData[] = tp.dataJson?.Channels?.Tunnels || [];
            setTunnelsData(tunnels);

            if (tunnels.length === 0) {
                console.log("No tunnels found in data");
                return;
            }

            // Load PDB files for each tunnel and create representations
            const apiEndpoint = getApiEndpoint(tp.database, tp.id, "tunnels");
            const reps: StateObjectSelector[] = [];

            for (let i = 0; i < tunnels.length; i++) {
                const tunnel = tunnels[i];
                const tunnelPdbUrl = `${apiEndpoint}/${tp.hash}/public/pdb/profile/tunnel_${tunnel.Id}.pdb`;

                try {
                    const tunnelData = await plugin.builders.data.download(
                        { url: tunnelPdbUrl },
                        { state: { isGhost: true } }
                    );

                    const trajectory = await plugin.builders.structure.parseTrajectory(tunnelData, "pdb");
                    const model = await plugin.builders.structure.createModel(trajectory);
                    const structure = await plugin.builders.structure.createStructure(model);

                    const color = getTunnelColor(i);
                    const representation = await plugin.builders.structure.representation.addRepresentation(structure, {
                        type: 'gaussian-surface',
                        color: 'uniform',
                        colorParams: { value: color }
                    });

                    reps.push(representation);

                    // hide all except the first tunnel
                    if (i > 0) {
                        plugin.state.data.updateCellState(representation.ref, { isHidden: true });
                    }
                } catch (err) {
                    console.error(`Error loading tunnel ${tunnel.Id}:`, err);
                }
            }

            setTunnelRepresentations(reps);

            // set first tunnel as visible
            if (reps.length > 0) {
                setVisibleTunnels([1]);
            }
        } catch (error) {
            console.error("Error loading tunnels data:", error);
        }
    };

    const getTunnelColor = (index: number): Color => {
        const colors = [
            Color(0x00FF00), // green
            Color(0x0000FF), // blue
            Color(0xFFFF00), // yellow
            Color(0xFF00FF), // magenta
            Color(0x00FFFF), // cyan
            Color(0xFFA500), // orange
            Color(0xFF1493), // deep pink
            Color(0x8A2BE2), // blue violet
        ];
        return colors[index % colors.length];
    };

    const toggleTunnel = (tunnelNumber: number) => {
        if (!plugin) return;

        const index = tunnelNumber - 1;
        if (index < 0 || index >= tunnelRepresentations.length) return;

        const isVisible = visibleTunnels.includes(tunnelNumber);

        if (isVisible) {
            setVisibleTunnels(visibleTunnels.filter(t => t !== tunnelNumber));
            plugin.state.data.updateCellState(tunnelRepresentations[index].ref, { isHidden: true });
        } else {
            setVisibleTunnels([...visibleTunnels, tunnelNumber]);
            plugin.state.data.updateCellState(tunnelRepresentations[index].ref, { isHidden: false });
        }
    };

    const changePocketsView = (pocketsView: PocketsViewType) => {
        if (plugin === undefined || prediction === undefined) {
            return;
        }

        prediction.pockets.forEach((pocket: PocketData, idx: number) => {
            showPocketInCurrentRepresentation(plugin, pocketsView, pocketRepresentations, idx, pocket.rank === pocketRank);
        });

        setPocketsView(pocketsView);
    };

    if (!tp.dataJson || tp.dataJson === "Error") {
        return <div>
            <h1>Error</h1>
            <p>There was an error while fetching the tunnels data. Try again later.</p>
        </div>;
    }

    return <div style={{ display: "flex" }}>
        <div style={{ width: "65%", margin: "5px" }}>
            <TunnelsTaskVisualizationBox
                plugin={plugin!}
                polymerRepresentations={polymerRepresentations}
                changePocketsView={changePocketsView}
                pocket={pocket}
            />
        </div>
        <div id="content-wrapper" style={{ width: "35%", margin: "5px" }}>
            <TunnelsTaskRightPanel
                tunnelsData={tunnelsData}
                visibleTunnels={visibleTunnels}
                toggleTunnel={toggleTunnel}
                tp={tp}
                plugin={plugin!}
                tunnelRepresentations={tunnelRepresentations}
            />
        </div>
    </div>;
}

async function createMolstarViewer() {
    const molstarContainer = document.getElementById("molstar-wrapper")!;

    const defaultSpec = DefaultPluginUISpec();
    const spec = {
        ...defaultSpec,
        layout: {
            initial: {
                isExpanded: false,
                showControls: false
            }
        },
        components: {
            ...defaultSpec.components,
            remoteState: 'none' as const
        }
    };

    const plugin = await createPluginUI({
        target: molstarContainer,
        spec: spec,
        render: renderReact18
    });

    return plugin;
}

export async function getTunnelsTaskContent(id: string, database: string, hash: string, structureName: string): Promise<TunnelsTaskProps> {
    const apiEndpoint = getApiEndpoint(database, id, "tunnels");

    const createResponse = (dataJson: any): TunnelsTaskProps => ({
        dataJson,
        hash,
        id,
        database,
        structureName
    });

    try {
        const dataJson = await fetch(`${apiEndpoint}/${hash}/public/data.json`)
            .then(res => res.json())
            .catch(err => {
                console.error("Error fetching data.json:", err);
                return null;
            });

        return createResponse(dataJson || "Error");
    } catch (error) {
        console.error("Error in getTunnelsTaskContent:", error);
        return createResponse("Error");
    }
}
