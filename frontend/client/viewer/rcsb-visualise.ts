import { RcsbFv, RcsbFvDisplayTypes, RcsbFvTrackDataElementInterface, RcsbFvBoardConfigInterface, RcsbFvRowExtendedConfigInterface, RcsbFvTrackData } from "@rcsb/rcsb-saguaro";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PredictionData, AlphaFoldColorsRcsb, AlphaFoldThresholdsRcsb, DefaultPocketColors } from '../custom-types';
import { highlightInViewerLabelIdWithoutFocus, highlightInViewerAuthId } from "./molstar-visualise";

// contains the last highlighted element
let lastElement: number = -1;
// ID of the DOM element where the plugin is placed
const domElementId = "application-rcsb";

/*  
    This is a workaround for the RcsbFvDisplayTypes being const enum with string values.
    That is not supported by the current version of the TypeScript transpiler (esbuild-loader)
    as we are still using Webpack.
    More info: https://github.com/evanw/esbuild/issues/128
    According to this issue, the following string constants might be changed when upgrading the RcsbFv library.
*/
enum RcsbFvDisplayTypesFixed {
    BLOCK,
    AREA,
    SEQUENCE
};

function getRcsbFvDisplayTypeFromFixed(displayType: RcsbFvDisplayTypesFixed) {
    const mapping = {
        [RcsbFvDisplayTypesFixed.BLOCK]: "block",
        [RcsbFvDisplayTypesFixed.AREA]: "area",
        [RcsbFvDisplayTypesFixed.SEQUENCE]: "sequence"
    };

    return mapping[displayType] as RcsbFvDisplayTypes;
}

/**
 * Method which initializes the Rcsb viewer and adds the tracks to it.
 * @param data Prediction data
 * @param molstarPlugin Mol* plugin
 * @returns The rendered Rcsb plugin.
 */
export function initRcsb(data: PredictionData, molstarPlugin: PluginUIContext) {
    const boardConfigData: RcsbFvBoardConfigInterface = {
        length: data.structure.sequence.length,
        includeAxis: true,
        highlightHoverPosition: true,
        highlightHoverCallback: (trackData: Array<RcsbFvTrackDataElementInterface>) => onHighlight(data, molstarPlugin, trackData),
        elementClickCallback: (trackData?: RcsbFvTrackDataElementInterface, event?: MouseEvent) => elementClicked(data, molstarPlugin, trackData, event)
    };

    const rowConfigData = createRowConfigDataRcsb(data);

    const elementId = domElementId; // div where the plugin is placed

    let rcsbPlugin = new RcsbFv({
        rowConfigData,
        boardConfigData,
        elementId
    });

    return rcsbPlugin;
}

/**
 * Method called when any element is clicked in the viewer.
 * @param predictionData Prediction data
 * @param molstarPlugin Mol* plugin
 * @param trackData Data of the clicked track
 * @param event Mouse event
 * @returns void
 */
function elementClicked(predictionData: PredictionData, molstarPlugin: PluginUIContext, trackData?: RcsbFvTrackDataElementInterface, event?: MouseEvent) {
    if (trackData && predictionData) {
        let element = predictionData.structure.indices[trackData!.begin - 1];
        if (element) {
            let id = Number(element.substring(element.indexOf('_') + 1));
            highlightInViewerAuthId(molstarPlugin, element[0], [id]);
        }
    }
}

/**
 * Method called when any element is highlighted in the viewer.
 * @param data Prediction data
 * @param molstarPlugin Mol* plugin
 * @param trackData Data of the clicked track
 * @param event Mouse event
 * @returns void
 */
function onHighlight(data: PredictionData, molstarPlugin: PluginUIContext, trackData: Array<RcsbFvTrackDataElementInterface>) {
    if (trackData.length === 0) return;
    lastElement = trackData[0].begin;

    //100ms debounce
    setTimeout(() => {
        if (data && trackData && trackData.length > 0 && lastElement === trackData[0].begin) {
            let element = data.structure.indices[trackData[0].begin - 1];
            if (element) {
                let id = Number(element.substring(element.indexOf('_') + 1));
                highlightInViewerLabelIdWithoutFocus(molstarPlugin, element[0], [id]);
            }
        }
    }, 100);
}

/**
 * Method which creates all of the tracks for the Rcsb viewer.
 * @param data Prediction data
 * @returns Configuration for the viewer
 */
function createRowConfigDataRcsb(data: PredictionData) {
    const rowConfigData: Array<RcsbFvRowExtendedConfigInterface> = [];
    rowConfigData.push({
        boardId: domElementId,
        trackId: "sequenceTrack",
        trackHeight: 20,
        trackColor: "#F9F9F9",
        displayType: getRcsbFvDisplayTypeFromFixed(RcsbFvDisplayTypesFixed.SEQUENCE),
        nonEmptyDisplay: true,
        rowTitle: "SEQUENCE",
        trackData: [{
            begin: 1,
            label: data.structure.sequence.join('')
        }]
    });

    //then we need to add the binding sites, if they exist
    if (data.structure.binding.length > 0) {
        const bindingData: RcsbFvTrackData = [];

        //create the blocks
        //we need to create the "holes" as well
        for (let i = 0; i < data.structure.binding.length; i++) {
            let firstElement = data.structure.binding[i];
            if (i < data.structure.binding.length - 1) {
                while ((data.structure.binding[i] + 1) === data.structure.binding[i + 1]) {
                    i++;
                    if (i >= data.structure.binding.length - 1) break;
                }
            }
            bindingData.push({
                begin: firstElement,
                end: data.structure.binding[i]
            });
        }

        rowConfigData.push({
            boardId: domElementId,
            trackId: "bindingsTrack",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: getRcsbFvDisplayTypeFromFixed(RcsbFvDisplayTypesFixed.BLOCK),
            displayColor: "#9542F5",
            rowTitle: "BINDING",
            trackData: bindingData
        });
    }

    //then we need to add the actual pockets, if there are any
    if (data.pockets.length > 0) {
        const pocketsData: RcsbFvTrackData = [];

        for (let y = 0; y < data.pockets.length; y++) {
            //first we need to assign a color to a pocket
            data.pockets[y].color = pickColor(y);

            //create the blocks with the same principle... 
            for (let i = 0; i < data.pockets[y].residues.length; i++) {
                let firstElement = data.pockets[y].residues[i];

                if (i < data.pockets[y].residues.length - 1) {
                    while (
                        data.pockets[y].residues[i][0] === data.pockets[y].residues[i + 1][0]
                        && Number(data.pockets[y].residues[i].substring(firstElement.indexOf('_') + 1)) + 1 === Number(data.pockets[y].residues[i + 1].substring(firstElement.indexOf('_') + 1))
                    ) {
                        i++;
                        if (i >= data.pockets[y].residues.length - 1) break;
                    }
                }

                let finalBegin = data.structure.indices.indexOf(firstElement) + 1;
                let finalEnd = data.structure.indices.indexOf(data.pockets[y].residues[i]) + 1;

                pocketsData.push({
                    begin: finalBegin,
                    end: finalEnd,
                    color: "#" + data.pockets[y].color, //later on, when the pocket should be hidden, we need to use the same color as the background one
                    provenanceName: data.pockets[y].name
                });
            }
        }

        rowConfigData.push({
            boardId: domElementId,
            trackId: "pocketsTrack",
            trackHeight: 20,
            trackColor: "#F9F9F9",
            displayType: getRcsbFvDisplayTypeFromFixed(RcsbFvDisplayTypesFixed.BLOCK),
            displayColor: "#FF0000",
            rowTitle: "POCKETS",
            trackData: pocketsData
        });
    }

    //then resolve the conservation, if available
    if (data.structure.scores.conservation && !data.structure.scores.conservation.every((value) => value === 0)) {
        const conservationData: RcsbFvTrackData = [];

        //we need to normalize the scores to fit in properly
        //by the definition of conservation scoring the maximum is log_2(20)
        const maximum = getLogBaseX(2, 20);

        for (let i = 0; i < data.structure.scores.conservation.length; i++) {
            conservationData.push({
                begin: i + 1,
                //do not forget to normalize
                value: data.structure.scores.conservation[i] / maximum,
            });
        }

        rowConfigData.push({
            boardId: domElementId,
            trackId: "conservationTrack",
            trackHeight: 40,
            trackColor: "#F9F9F9",
            displayType: getRcsbFvDisplayTypeFromFixed(RcsbFvDisplayTypesFixed.AREA),
            displayColor: "#6d6d6d",
            rowTitle: "CONSERVATION",
            trackData: conservationData,
        });
    }

    //then resolve alphafold scores, if available
    if (data.structure.scores.plddt && !data.structure.scores.plddt.every((value) => value === 0)) {
        const alphafoldData: RcsbFvTrackData = [];

        //we need to normalize the scores to fit in properly
        //by the definition of alphafold scores the maximum should be possibly 100
        const maximum = 100;

        for (let i = 0; i < data.structure.scores.plddt.length; i++) {
            alphafoldData.push({
                begin: i + 1,
                //do not forget to normalize and round to 5
                value: Number((data.structure.scores.plddt[i] / maximum).toFixed(5)),
            });
        }

        rowConfigData.push({
            boardId: domElementId,
            trackId: "alphafoldTrack",
            trackHeight: 40,
            trackColor: "#F9F9F9",
            displayType: getRcsbFvDisplayTypeFromFixed(RcsbFvDisplayTypesFixed.AREA),
            displayColor: {
                "thresholds": AlphaFoldThresholdsRcsb,
                "colors": AlphaFoldColorsRcsb,
            },
            rowTitle: "AF CONFIDENCE",
            trackData: alphafoldData,
        });
    }

    return rowConfigData;
}

/** Method that returns log_x(y).
 * @param x Base
 * @param y Number
 * @returns log_x(y)
*/
function getLogBaseX(x: number, y: number) {
    return Math.log(y) / Math.log(x);
}

/**
 * Method which assigns a color to a pocket, tries to choose one from the preset ones otherwise generates a random one
 * @param pocketRank Pocket rank
 * @returns A new color for the pocket
 */
function pickColor(pocketRank: number) {
    if (pocketRank >= DefaultPocketColors.length) {
        let result = Math.floor(Math.random() * 16777215).toString(16); //picks a totally random color
        if (result.length < 6) {
            result = "0".repeat(6 - result.length) + result;
        }
        return result;
    }
    return DefaultPocketColors[pocketRank];
}