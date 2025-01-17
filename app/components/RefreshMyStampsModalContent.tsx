// --- React & ReactDOM hooks
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";

// --- Types
import { PlatformGroupSpec, Platform, PROVIDER_ID, PLATFORM_ID } from "@gitcoin/passport-platforms/dist/commonjs/types";

// --- Identity tools
import { Stamp, VerifiableCredential, VerifiableCredentialRecord } from "@gitcoin/passport-types";
import { fetchVerifiableCredential } from "@gitcoin/passport-identity/dist/commonjs/src/credentials";

// --- Contexts
import { UserContext } from "../context/userContext";
import { CeramicContext } from "../context/ceramicContext";

// --- Datadog
import { datadogLogs } from "@datadog/browser-logs";

// --- Utils
import { PossibleEVMProvider } from "../signer/utils";

// --- UI components
// TODO: re-add toasts after design updates
import { useToast, IconButton, Spinner } from "@chakra-ui/react";
import { XMarkIcon } from "@heroicons/react/20/solid";

// --- App components
import { RefreshMyStampsModalContentCardList } from "../components/RefreshMyStampsModalContentCardList";

const iamUrl = process.env.NEXT_PUBLIC_PASSPORT_IAM_URL || "";
const rpcUrl = process.env.NEXT_PUBLIC_PASSPORT_MAINNET_RPC_URL;

export type RefreshMyStampsModalContentProps = {
  resetStampsAndProgressState: () => void;
  onClose: () => void;
  fetchedPossibleEVMStamps: PossibleEVMProvider[];
};

export type evmPlatformProvider = {
  checked: boolean;
  platformId: PLATFORM_ID;
  platformGroup: PlatformGroupSpec[];
};

export const RefreshMyStampsModalContent = ({
  onClose,
  fetchedPossibleEVMStamps,
  resetStampsAndProgressState,
}: RefreshMyStampsModalContentProps): JSX.Element => {
  const { address, signer } = useContext(UserContext);
  const { handleAddStamps, handleDeleteStamps } = useContext(CeramicContext);
  const [isLoading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [selectedEVMPlatformProviders, setSelectedEVMPlatformProviders] = useState<evmPlatformProvider[]>([]);
  const navigate = useNavigate();

  // TODO: update comments
  // SelectedProviders will be passed in to the sidebar to be filled there...
  const [verifiedProviders, setVerifiedProviders] = useState<PROVIDER_ID[]>([]);

  // TODO: update comments
  // SelectedProviders will be passed in to the sidebar to be filled there...
  const [selectedProviders, setSelectedProviders] = useState<PROVIDER_ID[]>([...verifiedProviders]);

  useEffect(() => {
    if (selectedProviders.length !== 0) {
      setCanSubmit(true);
    } else {
      setCanSubmit(false);
    }
  });

  const handleRefreshSelectedStamps = async () => {
    try {
      // TODO: add datadog logger
      // datadogLogs.logger.info("Successfully saved Stamp", { platform: platform.platformId });
      setLoading(true);
      const result = await Promise.all(
        selectedEVMPlatformProviders?.map(async (platformProviders) => {
          const platformId = platformProviders.platformId;
          const providerIds =
            platformProviders.platformGroup.reduce((all, stamp, i) => {
              return all.concat(stamp.providers?.map((provider) => provider.name as PROVIDER_ID));
            }, [] as PROVIDER_ID[]) || [];
          await handleFetchCredential(platformId, providerIds);
        })
      );
      setLoading(false);
      resetStampsAndProgressState();
      navigate("/dashboard");
    } catch (e) {
      // TODO: update datadog logger
      // datadogLogs.logger.error("Verification Error", { error: e, platform: platform.platformId });
      console.log(e);
      navigate("/dashboard");
      resetStampsAndProgressState();
    }
  };

  const handleFetchCredential = async (platformID: PLATFORM_ID, providerIDs: PROVIDER_ID[]): Promise<void> => {
    try {
      // This array will contain all providers that new validated VCs
      let vcs: Stamp[] = [];

      if (selectedProviders.length > 0) {
        const verified: VerifiableCredentialRecord = await fetchVerifiableCredential(
          iamUrl,
          {
            type: platformID,
            types: selectedProviders,
            version: "0.0.0",
            address: address || "",
            proofs: {},
            rpcUrl,
          },
          signer as { signMessage: (message: string) => Promise<string> }
        );

        // because we provided a types array in the params we expect to receive a
        // credentials array in the response...
        if (verified.credentials) {
          for (let i = 0; i < verified.credentials.length; i++) {
            let cred = verified.credentials[i];
            if (!cred.error && providerIDs.find((providerId: PROVIDER_ID) => cred?.record?.type === providerId)) {
              // add each of the requested/received stamps to the passport...
              vcs.push({
                provider: cred.record?.type as PROVIDER_ID,
                credential: cred.credential as VerifiableCredential,
              });
            }
          }
        }
      }

      // Delete all stamps ...
      await handleDeleteStamps(providerIDs as PROVIDER_ID[]);

      // .. and now add all newly validate stamps
      if (vcs.length > 0) {
        await handleAddStamps(vcs);
      }

      // TODO: update datadog logger
      // datadogLogs.logger.info("Successfully saved Stamp", { platform: platform.platformId });

      // grab all providers who are verified from the verify response
      const actualVerifiedProviders = providerIDs.filter(
        (providerId) =>
          !!vcs.find((vc: Stamp | undefined) => vc?.credential?.credentialSubject?.provider === providerId)
      );
      // both verified and selected should look the same after save
      setVerifiedProviders([...actualVerifiedProviders]);
      setSelectedProviders([...actualVerifiedProviders]);

      // TODO: re-add toasts after design updates
      // // Get the done toast messages
      // const { title, body, icon, platformId } = getDoneToastMessages(
      //   verificationStatus,
      //   updatedVerifiedProviders,
      //   initialMinusUpdated,
      //   updatedMinusInitial
      // );

      // // Display done toast
      // doneToast(title, body, icon, platformId);

      // setLoading(false);
    } catch (e: unknown) {
      // TODO: update datadog logger
      // datadogLogs.logger.error("Verification Error", { error: e, platform: platform.platformId });
      console.log(e);
      throw new Error();
      // doneToast(
      //   "Verification Failed",
      //   "There was an error verifying your stamp. Please try again.",
      //   "../../assets/verification-failed.svg",
      //   platform.platformId as PLATFORM_ID
      // );
    }
  };

  return (
    <>
      {fetchedPossibleEVMStamps.length > 0 ? (
        <div className="relative flex h-full flex-col">
          <div className="mb-6 text-2xl text-white">Stamps Found</div>
          <div>
            {" "}
            {/* TODO: update comments */}
            {/* container for platforms so user can scroll if they have a lot */}
            <RefreshMyStampsModalContentCardList
              verifiedProviders={verifiedProviders}
              selectedProviders={selectedProviders}
              fetchedPossibleEVMStamps={fetchedPossibleEVMStamps}
              selectedEVMPlatformProviders={selectedEVMPlatformProviders}
              setSelectedProviders={setSelectedProviders}
              setSelectedEVMPlatformProviders={setSelectedEVMPlatformProviders}
            />
          </div>
          <div className="mt-8 text-center text-pink-300 underline">
            <a href="#">How is my data stored?</a>
          </div>
          <div className="mt-16 mb-auto flex items-center justify-center">
            <button className="secondary-btn mr-2 w-full rounded-sm py-2 px-6" onClick={() => navigate("/dashboard")}>
              Cancel
            </button>
            <button
              className="ml-2 flex w-full items-center justify-center rounded-sm bg-accent py-2 px-6 text-white disabled:cursor-not-allowed disabled:bg-muted disabled:text-black"
              onClick={() => {
                handleRefreshSelectedStamps();
              }}
              disabled={!canSubmit}
            >
              Confirm Stamps
            </button>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col content-end">
          <button
            className="mt-4 mb-6 flex h-10 w-10 items-center justify-center self-center rounded-full border border-accent-2"
            onClick={onClose}
          >
            <XMarkIcon className="h-7 w-7 text-white" aria-hidden="true" />
          </button>
          <div className="text-center">
            <div className="m-auto mb-6 w-3/4 text-3xl text-white">No Eligible Web3 Stamps Found</div>
            <div className="mt-24 text-xl text-muted">Visit the Dashboard to explore more Stamp options.</div>
          </div>
          <button
            className="sidebar-verify-btn hover:backround-2 mt-36 flex w-full items-center justify-center rounded-sm text-white"
            onClick={() => {
              navigate("/dashboard");
              resetStampsAndProgressState();
            }}
          >
            Explore Stamps
            {isLoading ? <Spinner size="sm" className="my-auto ml-2" /> : <></>}
          </button>
        </div>
      )}
    </>
  );
};
