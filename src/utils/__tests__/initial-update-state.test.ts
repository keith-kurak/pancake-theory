import {
  type LaunchUpdateStatus,
  nextUpdateCheckState,
  UpdateCheckState,
} from "../initial-update-state";

const idle: LaunchUpdateStatus = {
  isChecking: false,
  isDownloading: false,
  isUpdatePending: false,
  isUpdateAvailable: false,
  hasDownloadedUpdate: false,
  hasError: false,
  hasCheckedSinceRestart: false,
};

describe("nextUpdateCheckState", () => {
  it("stays unknown while nothing has happened", () => {
    expect(nextUpdateCheckState(UpdateCheckState.Unknown, idle)).toBe(
      UpdateCheckState.Unknown,
    );
  });

  it("goes in progress while checking or downloading", () => {
    expect(
      nextUpdateCheckState(UpdateCheckState.Unknown, {
        ...idle,
        isChecking: true,
      }),
    ).toBe(UpdateCheckState.InProgress);
    expect(
      nextUpdateCheckState(UpdateCheckState.InProgress, {
        ...idle,
        isUpdateAvailable: true,
        isDownloading: true,
      }),
    ).toBe(UpdateCheckState.InProgress);
  });

  it("is ready once an update is downloaded", () => {
    expect(
      nextUpdateCheckState(UpdateCheckState.InProgress, {
        ...idle,
        isUpdateAvailable: true,
        isUpdatePending: true,
      }),
    ).toBe(UpdateCheckState.UpdateReady);
  });

  it("reports no update when a check finishes empty", () => {
    expect(
      nextUpdateCheckState(UpdateCheckState.InProgress, {
        ...idle,
        hasCheckedSinceRestart: true,
      }),
    ).toBe(UpdateCheckState.NoUpdateAvailable);
  });

  it("reports errors", () => {
    expect(
      nextUpdateCheckState(UpdateCheckState.InProgress, {
        ...idle,
        hasError: true,
      }),
    ).toBe(UpdateCheckState.Error);
  });

  it("notes when native state was already initialized at mount", () => {
    expect(
      nextUpdateCheckState(UpdateCheckState.Unknown, {
        ...idle,
        hasCheckedSinceRestart: true,
      }),
    ).toBe(UpdateCheckState.NativeStateInitialized);
  });

  it("never leaves a terminal state", () => {
    expect(
      nextUpdateCheckState(UpdateCheckState.Timeout, {
        ...idle,
        isUpdatePending: true,
      }),
    ).toBe(UpdateCheckState.Timeout);
  });
});
