import type {DetectionResult} from "@/lib/types";

export type FarmerScanState = {
  original: File | null;
  result: DetectionResult | null;
};

export type FarmerScanAction =
  | {type: "select-image"; file: File | null}
  | {type: "set-result"; result: DetectionResult}
  | {type: "reset"};

export const initialFarmerScanState: FarmerScanState = {
  original: null,
  result: null
};

export function farmerScanReducer(state: FarmerScanState, action: FarmerScanAction): FarmerScanState {
  switch (action.type) {
    case "select-image":
      return {
        original: action.file,
        result: null
      };
    case "set-result":
      return {
        ...state,
        result: action.result
      };
    case "reset":
      return initialFarmerScanState;
    default:
      return state;
  }
}