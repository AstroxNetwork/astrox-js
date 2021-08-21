# @astrox/identity-ledgerhq

TypeScript library to support a Hardware Ledger Wallet identity for applications on the [Internet Computer](https://dfinity.org/).

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

---

## Installation

Using authentication:

```
npm i --save @astrox/identity-ledgerhq
```

### In the browser:

```javascript
import { LedgerIdentity } from '@astrox/identity-ledgerhq';

// ...
const identity = await LedgerIdentity.create();
const agent = new HttpAgent({ identity });
```

Note: depends on [@astrox/agent](https://www.npmjs.com/package/@astrox/agent) and
[@astrox/identity](https://www.npmjs.com/package/@astrox/identity).
