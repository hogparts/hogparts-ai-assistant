# Hogparts Fitment Service

Canonical vehicle-fitment layer shared by the Hogparts AI Assistant, Select Your Bike and future fitment features.

## Principles

- One canonical Hogparts vehicle identity, independent of supplier.
- Existing MCS ↔ Parts Europe model-name matching is authoritative input and must be reused, not recreated.
- Supplier aliases and IDs are retained against the canonical vehicle.
- Product applications are evidence-backed and keep their source (MCS API, Parts Europe, Shopify).
- Customer input may resolve from year + model code, year + recognised model name, or other unambiguous aliases.
- Family-only input such as "2022 Softail" is not an exact vehicle and should trigger a model clarification.
- Fitment facts are deterministic. AI may interpret customer language and explain results, but does not invent fitment.

## Canonical vehicle shape

```json
{
  "vehicle_id": "hd:2020:fxlr",
  "make": "Harley-Davidson",
  "year": 2020,
  "family": "Softail",
  "model_name": "Low Rider",
  "model_code": "FXLR",
  "engine": "107",
  "aliases": {
    "parts_europe": [],
    "mcs": [],
    "shopify": []
  }
}
```

## Application shape

```json
{
  "vehicle_id": "hd:2020:fxlr",
  "shopify_product_id": "gid://shopify/Product/...",
  "sku": "...",
  "source": "parts_europe",
  "source_part_id": "...",
  "confidence": "exact",
  "evidence": "supplier-fitment"
}
```

## Planned API

- `GET /vehicles/resolve?year=2020&query=FXLR`
- `GET /vehicles/:vehicle_id/products?category=brake-pads`
- `GET /products/:sku/fitment`
- `POST /sync/mcs`
- `POST /sync/parts-europe`
- `POST /sync/shopify`

The service will initially be developed alongside the existing AI assistant, then split into its own deployable service once the canonical index is populated.
