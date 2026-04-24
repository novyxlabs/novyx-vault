export type VaultMode = "local" | "cloud";

export interface VaultStatus {
  mode: VaultMode;
  storageDriver: "filesystem" | "supabase";
  rootLabel: string;
  capabilities: {
    localFiles: boolean;
    offlineNoteEditing: boolean;
    accountAuth: boolean;
    publishing: boolean;
    indexedSearch: boolean;
    crossDeviceSync: false;
  };
  warnings: string[];
}

export function getVaultStatus(): VaultStatus {
  if (process.env.STORAGE_MODE === "supabase") {
    return {
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
      warnings: [
        "Cloud workspace is hosted storage, not device mirroring for local files.",
      ],
    };
  }

  return {
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
  };
}
