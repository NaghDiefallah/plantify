import {describe, expect, test} from "bun:test";

import {farmerScanReducer, initialFarmerScanState} from "@/components/farmer/farmer-scan-state";
import type {DetectionResult} from "@/lib/types";

const sampleResult: DetectionResult = {
  disease_type: "tomato_early_blight",
  plant_name: "Tomato",
  disease: "Early blight",
  confidence_score: 0.91,
  treatment_recommendations: "Immediate: remove infected leaves.",
  domain: "color"
};

describe("farmerScanReducer", () => {
  test("replacing an image clears the previous result", () => {
    const firstFile = new File(["first"], "first-leaf.jpg", {type: "image/jpeg"});
    const nextFile = new File(["second"], "second-leaf.jpg", {type: "image/jpeg"});

    const withFirstImage = farmerScanReducer(initialFarmerScanState, {type: "select-image", file: firstFile});
    const withResult = farmerScanReducer(withFirstImage, {type: "set-result", result: sampleResult});
    const replacedImage = farmerScanReducer(withResult, {type: "select-image", file: nextFile});

    expect(replacedImage.original).toBe(nextFile);
    expect(replacedImage.result).toBeNull();
  });

  test("reset clears both the selected image and result", () => {
    const selectedFile = new File(["leaf"], "leaf.jpg", {type: "image/jpeg"});

    const withImage = farmerScanReducer(initialFarmerScanState, {type: "select-image", file: selectedFile});
    const withResult = farmerScanReducer(withImage, {type: "set-result", result: sampleResult});
    const resetState = farmerScanReducer(withResult, {type: "reset"});

    expect(resetState).toEqual(initialFarmerScanState);
  });

  test("a new result can be applied successfully after reset", () => {
    const selectedFile = new File(["leaf"], "leaf.jpg", {type: "image/jpeg"});

    const withImage = farmerScanReducer(initialFarmerScanState, {type: "select-image", file: selectedFile});
    const withResult = farmerScanReducer(withImage, {type: "set-result", result: sampleResult});
    const resetState = farmerScanReducer(withResult, {type: "reset"});

    const followUpResult: DetectionResult = {
      ...sampleResult,
      disease_type: "tomato_late_blight",
      disease: "Late blight",
      confidence_score: 0.96
    };

    const withFollowUpResult = farmerScanReducer(resetState, {type: "set-result", result: followUpResult});

    expect(withFollowUpResult.original).toBeNull();
    expect(withFollowUpResult.result).toEqual(followUpResult);
  });
});