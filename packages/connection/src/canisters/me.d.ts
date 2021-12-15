import type { Principal } from '@dfinity/principal';
export interface AccountDetails {
  principal: Principal;
  account_identifier: AccountIdentifier;
  hardware_wallet_accounts: Array<HardwareWalletAccountDetails>;
  sub_accounts: Array<SubAccountDetails>;
}
export interface AccountDetailsResult {
  account_details: [] | [AccountDetails];
  anchor_number: string;
}
export type AccountIdentifier = string;
export type AuthType = { Login: null } | { Recovery: null } | { Register: null };
export type CredentialId = Array<number>;
export interface Delegation {
  pubkey: PublicKey;
  targets: [] | [Array<Principal>];
  expiration: Timestamp;
}
export type DeviceAddResponse = { added: { user_name: string } } | { failed: null };
export interface DeviceData {
  device_name: string;
  device_type: DeviceType;
  pub_key: DeviceKey;
  purpose: Purpose;
  credential_id: [] | [CredentialId];
}
export interface DeviceDataExternal {
  device_name: string;
  device_type: DeviceType;
  pub_key: string;
  purpose: Purpose;
  credential_id: [] | [CredentialId];
}
export type DeviceKey = PublicKey;
export type DeviceRemoveResponse = { failed: null } | { removed: null };
export type DeviceType =
  | { IdentityProvider: null }
  | { SecurityDevice: null }
  | { EthereumMetaMask: null };
export type GetDelegationResponse =
  | { no_such_delegation: null }
  | { signed_delegation: SignedDelegation };
export interface GetDelegationResponseQr {
  user_key: UserKey;
  extra: string;
  get_delegation_response: GetDelegationResponse;
}
export interface HardwareWalletAccountDetails {
  principal: Principal;
  name: string;
  account_identifier: AccountIdentifier;
}
export interface IPProfile {
  user_name: string;
  role_type: RoleType;
  devices: Array<DeviceData>;
}
export interface Profile {
  user_name: string;
  role_type: RoleType;
  devices: Array<DeviceData>;
}
export type PublicKey = Array<number>;
export type Purpose = { authentication: null } | { recovery: null };
export type RegisterResponse = { canister_full: null } | { registered: { user_name: string } };
export type RoleType = { Sub: null } | { Main: null };
export type SessionKey = PublicKey;
export interface SignedDelegation {
  signature: Array<number>;
  delegation: Delegation;
}
export type SubAccount = Array<number>;
export interface SubAccountDetails {
  name: string;
  sub_account: SubAccount;
  account_identifier: AccountIdentifier;
}
export type Timestamp = bigint;
export type UpdateNNSWalletResponse = { success: null } | { failed: null };
export type UserKey = PublicKey;
export default interface _SERVICE {
  add_ii_anchor_number: (arg_0: string, arg_1: DeviceType, arg_2: string) => Promise<Array<string>>;
  add_new_device: (
    arg_0: DeviceDataExternal,
    arg_1: string,
    arg_2: DeviceType,
  ) => Promise<DeviceAddResponse>;
  get_delegation: (
    arg_0: string,
    arg_1: DeviceType,
    arg_2: string,
    arg_3: SessionKey,
    arg_4: Timestamp,
  ) => Promise<GetDelegationResponse>;
  get_delegation_qr: (arg_0: string) => Promise<[] | [GetDelegationResponseQr]>;
  get_ii_anchor_number_by_name: (arg_0: string) => Promise<Array<string>>;
  get_nns_wallets: (arg_0: string, arg_1: [] | [string]) => Promise<Array<AccountDetailsResult>>;
  get_profile_by_name: (
    arg_0: string,
  ) => Promise<[[] | [Profile], Array<Profile>, Array<IPProfile>]>;
  prepare_delegation: (
    arg_0: string,
    arg_1: DeviceType,
    arg_2: string,
    arg_3: SessionKey,
    arg_4: [] | [bigint],
  ) => Promise<[UserKey, Timestamp]>;
  prepare_delegation_qr: (
    arg_0: string,
    arg_1: string,
    arg_2: DeviceType,
    arg_3: string,
    arg_4: SessionKey,
    arg_5: [] | [bigint],
    arg_6: string,
  ) => Promise<[UserKey, Timestamp]>;
  register_user_main: (arg_0: string, arg_1: DeviceDataExternal) => Promise<RegisterResponse>;
  unbind_device: (arg_0: string, arg_1: string, arg_2: DeviceType) => Promise<DeviceRemoveResponse>;
  update_nns_wallets: (
    arg_0: string,
    arg_1: DeviceType,
    arg_2: string,
    arg_3: AccountDetails,
  ) => Promise<UpdateNNSWalletResponse>;
}
