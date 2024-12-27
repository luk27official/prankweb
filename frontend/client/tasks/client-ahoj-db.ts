import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PocketData } from "../custom-types";
import { getPocketAtomCoordinates } from "../viewer/molstar-visualise";

export function getAhojDBURL(pocket: PocketData, plugin: PluginUIContext) {
    const coords = getPocketAtomCoordinates(plugin, pocket.surface);

    const points: Array<Array<number>> = [];
    coords.forEach(coord => points.push([coord.x, coord.y, coord.z]));

    // calculate the average of the coordinates
    const middleResidue = points.reduce((acc, val) => {
        return {
            x: acc.x + val[0],
            y: acc.y + val[1],
            z: acc.z + val[2]
        };
    }, { x: 0, y: 0, z: 0 });

    middleResidue.x /= points.length;
    middleResidue.y /= points.length;
    middleResidue.z /= points.length;

    // calculate the nearest coordinate to the average
    let nearestCoord = points[0];
    let minDistance = Number.MAX_VALUE;

    points.forEach(coord => {
        const distance = Math.sqrt(
            Math.pow(coord[0] - middleResidue.x, 2) +
            Math.pow(coord[1] - middleResidue.y, 2) +
            Math.pow(coord[2] - middleResidue.z, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            nearestCoord = coord;
        }
    });

    // TODO: Fix this to return the correct URL
    // TODO: Also watch out for UniProt IDs
    return `https://apoholo.cz/db/search?${pocket.rank}`;
}