import { describe, expect, it, afterEach } from "vitest";
import { getVaultStatus } from "@/lib/vault-status";

const originalStorageMode = process.env.STORAGE_MODE;

afterEach(() => {
  if (originalStorageMode === undefined) {
    delete process.env.STORAGE_MODE;
  } else {
    process.env.STORAGE_MODE = originalStorageMode;
  }
});

describe("getVaultStatus", () => {
  it("returns local vault status when STORAGE_MODE is unset", () => {
    delete process.env.STORAGE_MODE;

    expect(getVaultStatus()).toEqual({
      mode: "local",
      storageDriver: "filesystem",
      rootLabel: "~/SecondBrain",
      capabilities: {
        localFiles: true,
        offlineNoteEditing: true,
        accountAuth: false,
        publishing: false,
        indexedSearch: false,
        crossDeviceSync: false,
      },
      warnings: [],
    });
  });

  it("returns cloud workspace status when STORAGE_MODE is supabase", () => {
    process.env.STORAGE_MODE = "supabase";

    expect(getVaultStatus()).toEqual({
      mode: "cloud",
      storageDriver: "supabase",
      rootLabel: "Supabase cloud workspace",
      capabilities: {
        localFiles: false,
        offlineNoteEditing: false,
        accountAuth: true,
        publishing: true,
        indexedSearch: true,
        crossDeviceSync: false,
      },
      warnings: ["Cloud workspace is hosted storage, not device mirroring for local files."],
    });
  });
});
