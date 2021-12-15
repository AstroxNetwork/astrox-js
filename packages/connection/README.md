# @astrox/connection

Connection packages for DApps

---

## Installation

Using Connection:

```
npm i --save @astrox/connection
```

### In the browser:

```typescript
import { IC } from "@astrox/connection";
import { PermissionsType } from "@astrox/connection/lib/cjs/types";

(async () => {
    await IC.connect({
      appId: process.env.CANISTER_ID!, // your canister ID, optional
      identityProvider: 'https://identity.ic0.app/#authorize', // identity provider, by default to AstroX Me
      permissions: [PermissionsType.identity, PermissionsType.wallet], // PermissionsType with identity or wallet, or both
      onAuthenticated: async (thisIc) => {
        console.log(window.ic.wallet);
        console.log(await window.ic.queryBalance());
        console.log(window.ic.identity);
      },
      onError:(err)=>{
          console.log(err);
      }
    }))();
```
