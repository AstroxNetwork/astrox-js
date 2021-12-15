export default ({ IDL }) => {
    const DeviceType = IDL.Variant({
        'IdentityProvider': IDL.Null,
        'SecurityDevice': IDL.Null,
        'EthereumMetaMask': IDL.Null,
    });
    const Purpose = IDL.Variant({
        'authentication': IDL.Null,
        'recovery': IDL.Null,
    });
    const CredentialId = IDL.Vec(IDL.Nat8);
    const DeviceDataExternal = IDL.Record({
        'device_name': IDL.Text,
        'device_type': DeviceType,
        'pub_key': IDL.Text,
        'purpose': Purpose,
        'credential_id': IDL.Opt(CredentialId),
    });
    const DeviceAddResponse = IDL.Variant({
        'added': IDL.Record({ 'user_name': IDL.Text }),
        'failed': IDL.Null,
    });
    const PublicKey = IDL.Vec(IDL.Nat8);
    const SessionKey = PublicKey;
    const Timestamp = IDL.Nat64;
    const Delegation = IDL.Record({
        'pubkey': PublicKey,
        'targets': IDL.Opt(IDL.Vec(IDL.Principal)),
        'expiration': Timestamp,
    });
    const SignedDelegation = IDL.Record({
        'signature': IDL.Vec(IDL.Nat8),
        'delegation': Delegation,
    });
    const GetDelegationResponse = IDL.Variant({
        'no_such_delegation': IDL.Null,
        'signed_delegation': SignedDelegation,
    });
    const UserKey = PublicKey;
    const GetDelegationResponseQr = IDL.Record({
        'user_key': UserKey,
        'extra': IDL.Text,
        'get_delegation_response': GetDelegationResponse,
    });
    const AccountIdentifier = IDL.Text;
    const HardwareWalletAccountDetails = IDL.Record({
        'principal': IDL.Principal,
        'name': IDL.Text,
        'account_identifier': AccountIdentifier,
    });
    const SubAccount = IDL.Vec(IDL.Nat8);
    const SubAccountDetails = IDL.Record({
        'name': IDL.Text,
        'sub_account': SubAccount,
        'account_identifier': AccountIdentifier,
    });
    const AccountDetails = IDL.Record({
        'principal': IDL.Principal,
        'account_identifier': AccountIdentifier,
        'hardware_wallet_accounts': IDL.Vec(HardwareWalletAccountDetails),
        'sub_accounts': IDL.Vec(SubAccountDetails),
    });
    const AccountDetailsResult = IDL.Record({
        'account_details': IDL.Opt(AccountDetails),
        'anchor_number': IDL.Text,
    });
    const RoleType = IDL.Variant({ 'Sub': IDL.Null, 'Main': IDL.Null });
    const DeviceKey = PublicKey;
    const DeviceData = IDL.Record({
        'device_name': IDL.Text,
        'device_type': DeviceType,
        'pub_key': DeviceKey,
        'purpose': Purpose,
        'credential_id': IDL.Opt(CredentialId),
    });
    const Profile = IDL.Record({
        'user_name': IDL.Text,
        'role_type': RoleType,
        'devices': IDL.Vec(DeviceData),
    });
    const IPProfile = IDL.Record({
        'user_name': IDL.Text,
        'role_type': RoleType,
        'devices': IDL.Vec(DeviceData),
    });
    const RegisterResponse = IDL.Variant({
        'canister_full': IDL.Null,
        'registered': IDL.Record({ 'user_name': IDL.Text }),
    });
    const DeviceRemoveResponse = IDL.Variant({
        'failed': IDL.Null,
        'removed': IDL.Null,
    });
    const UpdateNNSWalletResponse = IDL.Variant({
        'success': IDL.Null,
        'failed': IDL.Null,
    });
    return IDL.Service({
        'add_ii_anchor_number': IDL.Func([IDL.Text, DeviceType, IDL.Text], [IDL.Vec(IDL.Text)], []),
        'add_new_device': IDL.Func([DeviceDataExternal, IDL.Text, DeviceType], [DeviceAddResponse], []),
        'get_delegation': IDL.Func([IDL.Text, DeviceType, IDL.Text, SessionKey, Timestamp], [GetDelegationResponse], ['query']),
        'get_delegation_qr': IDL.Func([IDL.Text], [IDL.Opt(GetDelegationResponseQr)], ['query']),
        'get_ii_anchor_number_by_name': IDL.Func([IDL.Text], [IDL.Vec(IDL.Text)], ['query']),
        'get_nns_wallets': IDL.Func([IDL.Text, IDL.Opt(IDL.Text)], [IDL.Vec(AccountDetailsResult)], ['query']),
        'get_profile_by_name': IDL.Func([IDL.Text], [IDL.Opt(Profile), IDL.Vec(Profile), IDL.Vec(IPProfile)], ['query']),
        'prepare_delegation': IDL.Func([IDL.Text, DeviceType, IDL.Text, SessionKey, IDL.Opt(IDL.Nat64)], [UserKey, Timestamp], []),
        'prepare_delegation_qr': IDL.Func([
            IDL.Text,
            IDL.Text,
            DeviceType,
            IDL.Text,
            SessionKey,
            IDL.Opt(IDL.Nat64),
            IDL.Text,
        ], [UserKey, Timestamp], []),
        'register_user_main': IDL.Func([IDL.Text, DeviceDataExternal], [RegisterResponse], []),
        'unbind_device': IDL.Func([IDL.Text, IDL.Text, DeviceType], [DeviceRemoveResponse], []),
        'update_nns_wallets': IDL.Func([IDL.Text, DeviceType, IDL.Text, AccountDetails], [UpdateNNSWalletResponse], []),
    });
};
export const init = ({ IDL }) => { return []; };
//# sourceMappingURL=me.idl.js.map