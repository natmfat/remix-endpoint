# Remix Endpoint

Inpsired by [Koa Zod Router](https://github.com/JakeFenley/koa-zod-router). Create Remix endpoints (both loaders and actions) with

- built-in validation with [Zod](https://www.npmjs.com/package/zod) and [Zod Form Data](https://www.npmjs.com/package/zod-form-data)
- endpoint [intents](https://github.com/remix-run/remix/discussions/3138) (enables "multiple" actions in the same handler)

## Installation

```
pnpm install remix-endpoint
```

## Usage

```tsx
import { RemixAction, Router } from "remix-endpoint";
import { createIntent } from "remix-endpoint/react/createIntent";
import { zfd } from "zod-form-data";
import { z } from "zod";

enum ActionIntent {
  CREATE_OBJECT = "createObject"
}

// alternatively, just import from react/Intent (but this only uses strings)
const Intent = createIntent<ActionIntent>();

export const action = new RemixAction()
  .register({
    method: "POST",
    intent: ActionIntent.CREATE_OBJECT,
    validate: {
      // if you wanted to validate body instead:
      // body: z.object({ name: z.string() })

      // but remix forms are better:
      formData: zfd.formData({
        name: z.text(),
      }),
    },
    handler: async ({ formData: { name } }) => {
      await createObject(name);
      return Router.standardResponse(true, "Successfully created object!");
    },
  })
  .create();


<Form>
  <Intent value={ActionIntent.CREATE_OBJECT}>
</Form>
```
