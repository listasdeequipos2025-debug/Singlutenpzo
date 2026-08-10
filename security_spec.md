# Security Specification: Eduard King POS / Inventory System

## 1. Data Invariants

- **Inventory integrity**: Product quantity (stock) and sale price can never be negative.
- **Sales trace**: Sales records must contain a valid product reference ID and must record actual positive quantities sold.
- **Financial metrics consistency**: All financial collections (sales, purchases, expenses, returns) must declare valid non-negative amounts, categories, dates, and months.
- **PIN constraints**: The administrator login PIN must always be exactly a 4-character numeric string.

---

## 2. The "Dirty Dozen" Poison Payloads

### Payload 1: Negative Price Injection (Product)
```json
{
  "name": "Iphone 15 Pro Max",
  "category": "equipos",
  "salePrice": -150.00,
  "stock": 10
}
```
*Expected Result*: `PERMISSION_DENIED` - Price must be non-negative.

### Payload 2: Ghost Field Poisoning / Privilege Escalation (Product)
```json
{
  "name": "Iphone 15 Pro Max",
  "category": "equipos",
  "salePrice": 1200.00,
  "stock": 10,
  "isAdminProduct": true,
  "shadowSecretField": "malicious"
}
```
*Expected Result*: `PERMISSION_DENIED` - Keys list does not match exact schema.

### Payload 3: Invalid Category Injection (Product)
```json
{
  "name": "Case Protector",
  "category": "invalid_category",
  "salePrice": 15.00,
  "stock": 50
}
```
*Expected Result*: `PERMISSION_DENIED` - Category enum validation failure.

### Payload 4: Negative Quantity Sale (Sale)
```json
{
  "productName": "Iphone 15 Pro Max",
  "productId": "iphone_15",
  "category": "equipos",
  "quantity": -2,
  "salePrice": 1200.00,
  "profit": 300.00,
  "date": "2026-07-14",
  "month": "2026-07"
}
```
*Expected Result*: `PERMISSION_DENIED` - Quantity must be positive.

### Payload 5: Missing Required Fields (Sale)
```json
{
  "productName": "Iphone 15 Pro Max",
  "productId": "iphone_15",
  "category": "equipos"
}
```
*Expected Result*: `PERMISSION_DENIED` - Missing required fields such as quantity and salePrice.

### Payload 6: Invalid Payment Status (Sale)
```json
{
  "productName": "Iphone 15",
  "productId": "iphone_15",
  "category": "equipos",
  "quantity": 1,
  "salePrice": 1000.00,
  "profit": 200.00,
  "date": "2026-07-14",
  "month": "2026-07",
  "status": "not_paid_yet"
}
```
*Expected Result*: `PERMISSION_DENIED` - Status must be either "pagado" or "pendiente".

### Payload 7: Too Large ID Injection (Denial of Wallet)
`id: "iphone_15_very_long_garbage_key_to_cause_huge_index_bloat_abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz1234567890"`
*Expected Result*: `PERMISSION_DENIED` - ID string exceeds 128 characters.

### Payload 8: Invalid Purchase Type (Purchase)
```json
{
  "invoiceNumber": "INV-001",
  "date": "2026-07-14",
  "month": "2026-07",
  "totalAmount": 500.00,
  "type": "custom_credit_type",
  "status": "pendiente"
}
```
*Expected Result*: `PERMISSION_DENIED` - Purchase type must be "contado" or "credito".

### Payload 9: Empty Description Operating Expense (Expense)
```json
{
  "description": "",
  "amount": 250.00,
  "date": "2026-07-14",
  "month": "2026-07",
  "category": "alquiler"
}
```
*Expected Result*: `PERMISSION_DENIED` - Description size must be greater than 0.

### Payload 10: Negative Operating Expense (Expense)
```json
{
  "description": "Pago de Alquiler",
  "amount": -250.00,
  "date": "2026-07-14",
  "month": "2026-07",
  "category": "alquiler"
}
```
*Expected Result*: `PERMISSION_DENIED` - Amount must be non-negative.

### Payload 11: Invalid Return Quantity (Return)
```json
{
  "productId": "iphone_15",
  "productName": "Iphone 15 Pro Max",
  "category": "equipos",
  "quantity": 0,
  "date": "2026-07-14",
  "month": "2026-07",
  "refundAmount": 1200.00,
  "discountCostFromProfit": false
}
```
*Expected Result*: `PERMISSION_DENIED` - Returned quantity must be greater than 0.

### Payload 12: Invalid Security PIN length (Settings)
```json
{
  "pin": "12345"
}
```
*Expected Result*: `PERMISSION_DENIED` - PIN must be exactly 4 characters.

---

## 3. Mock Security Test Suite

The security rules validator acts as a unit test runner over the payloads:

```typescript
import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

describe("Eduard King Security Rules Validation", () => {
  it("fails to write negative product prices", async () => {
    const db = getTestDatabase();
    await assertFails(db.collection("inventory").doc("test_prod").set({
      name: "Iphone 15 Pro Max",
      category: "equipos",
      salePrice: -150.00,
      stock: 10
    }));
  });

  it("fails to register negative quantity sales", async () => {
    const db = getTestDatabase();
    await assertFails(db.collection("sales").doc("test_sale").set({
      productName: "Iphone 15 Pro Max",
      productId: "iphone_15",
      category: "equipos",
      quantity: -2,
      salePrice: 1200.00,
      profit: 300.00,
      date: "2026-07-14",
      month: "2026-07"
    }));
  });

  it("fails to set invalid settings PIN length", async () => {
    const db = getTestDatabase();
    await assertFails(db.collection("settings").doc("admin").set({
      pin: "12345"
    }));
  });
});
```
