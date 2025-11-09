import { Color } from "molstar/lib/mol-util/color";

const TUNNEL_COLOR_HEX = [
    '#2E86AB', // Ocean blue - primary tunnel
    '#A23B72', // Rich magenta - secondary tunnel
    '#F18F01', // Vibrant orange
    '#06A77D', // Teal green
    '#D62246', // Cherry red
    '#8B4789', // Deep purple
    '#F6AE2D', // Golden yellow
    '#2A9D8F', // Turquoise
    '#E76F51', // Terracotta
    '#4A5899', // Royal blue
    '#BC4B51', // Brick red
    '#6A994E', // Forest green
    '#F77F00', // Burnt orange
    '#9B5DE5', // Lavender
    '#00BBF9', // Sky blue
];

export const getTunnelColorHex = (index: number): string => {
    return TUNNEL_COLOR_HEX[index % TUNNEL_COLOR_HEX.length];
};

export const getTunnelColor = (index: number): Color => {
    const hex = TUNNEL_COLOR_HEX[index % TUNNEL_COLOR_HEX.length];
    return Color(parseInt(hex.substring(1), 16));
};
