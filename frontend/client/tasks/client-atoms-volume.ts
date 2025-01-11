import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PocketData, Point3D } from "../custom-types";
import { getPocketAtomCoordinates } from "../viewer/molstar-visualise";
import qh from 'quickhull3d';

// Cache for pocket volumes
const pocketVolumes = new Map<string, number>();

/**
 * Computes the volume of a triangle in 3D space.
 * https://stackoverflow.com/questions/1406029/
 * @param p1 First point of the triangle
 * @param p2 Second point of the triangle
 * @param p3 Third point of the triangle
 * @returns Volume of the triangle
 */
function computeTriangleVolume(p1: Point3D, p2: Point3D, p3: Point3D) {
    const v321 = p3.x * p2.y * p1.z;
    const v231 = p2.x * p3.y * p1.z;
    const v312 = p3.x * p1.y * p2.z;
    const v132 = p1.x * p3.y * p2.z;
    const v213 = p2.x * p1.y * p3.z;
    const v123 = p1.x * p2.y * p3.z;

    return (1.0 / 6.0) * (-v321 + v231 + v312 - v132 - v213 + v123);
}

/**
 * Computes the volume of a pocket.
 * @param plugin Mol* plugin
 * @param pocket Pocket data
 * @returns Computed pocket volume
 */
export async function computePocketVolume(plugin: PluginUIContext, pocket: PocketData): Promise<number> {

    if (pocketVolumes.has(pocket.name)) {
        return pocketVolumes.get(pocket.name)!;
    }

    const coords = getPocketAtomCoordinates(plugin, pocket.surface);

    const points: Array<Array<number>> = [];
    coords.forEach(coord => points.push([coord.x, coord.y, coord.z]));

    const hull = qh(points); //compute the convex hull

    const volumes: number[] = [];

    for (const face of hull) {
        volumes.push(computeTriangleVolume(coords[face[0]], coords[face[1]], coords[face[2]]));
    }

    const finalVolume = Math.abs(volumes.reduce((a, b) => a + b, 0));

    pocketVolumes.set(pocket.name, finalVolume);

    return finalVolume;
}
