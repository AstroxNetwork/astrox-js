# @astrox/auth-client

Simple interface to get your web application authenticated with the Internet Identity Service

Visit the [Dfinity Forum](https://forum.dfinity.org/) and [SDK Documentation](https://sdk.dfinity.org/docs/index.html) for more information and support building on the Internet Computer.

Additional API Documentation can be found [here](https://peacock.dev/auth-client-docs).

---

## Installation

Using AuthClient:

```
npm i --save @astrox/auth-client
```

### In the browser:

```
import { AuthClient } from "@astrox/auth-client";
```

To get started with auth client, run

```js
const authClient = await AuthClient.create();
```

The authClient can log in with

```js
authClient.login({
  onSuccess: async () => {
    // authClient now has an identity
  },
});
```

It opens an `identity.ic0.app` window, saves your delegation to localStorage, and then sets you up with an identity.

Then, you can use that identity to make authenticated calls using the `@astrox/agent` `Actor`.

```js
const identity = await authClient.getIdentity();
const actor = Actor.createActor(idlFactory, {
  agent: new HttpAgent({
    identity,
  }),
  canisterId,
});
```

Note: depends on [@astrox/agent](https://www.npmjs.com/package/@astrox/agent), [@astrox/authentication](https://www.npmjs.com/package/@astrox/authentication), and
[@astrox/identity](https://www.npmjs.com/package/@astrox/identity).
