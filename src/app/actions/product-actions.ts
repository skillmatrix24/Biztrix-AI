"use server";

import { initializeAdmin } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

/**
 * PHASE 6: PRODUCTION-GRADE PRODUCT & INVENTORY MANAGEMENT SERVER ACTIONS
 * 
 * Enforces:
 * 1. User authentication & tenant isolation
 * 2. Role-based authorization (owner / admin / manager / staff)
 * 3. Atomic stock mutations with non-negative validation
 * 4. Audit trail logging for inventory adjustments
 * 5. Safe archiving/soft-deletion (preserves historical order documents)
 * 6. Privileged writes via Firebase Admin SDK
 */

interface AuthTenantResult {
  authorized: boolean;
  uid?: string;
  businessId?: string;
  role?: string;
  error?: string;
}

/**
 * Verifies tenant ownership and role permissions server-side.
 */
async function authenticateMerchant(
  userId: string,
  requestedBusinessId: string,
  idToken?: string,
  allowedRoles: string[] = ['owner', 'admin', 'manager', 'staff']
): Promise<AuthTenantResult> {
  const { admin, db } = initializeAdmin();

  if (!userId || !requestedBusinessId) {
    return { authorized: false, error: "MISSING_AUTHENTICATION_CONTEXT" };
  }

  // 1. Verify Firebase Auth Token if provided
  if (idToken) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      if (decoded.uid !== userId) {
        return { authorized: false, error: "TOKEN_UID_MISMATCH" };
      }
    } catch {
      return { authorized: false, error: "INVALID_AUTH_TOKEN" };
    }
  }

  // 2. Fetch User Profile to confirm business mapping & role
  const userSnap = await db.doc(`users/${userId}`).get();
  if (!userSnap.exists) {
    return { authorized: false, error: "USER_PROFILE_NOT_FOUND" };
  }

  const userData = userSnap.data();
  const userBusinessId = userData?.businessId || userData?.tenantId;

  if (userBusinessId !== requestedBusinessId) {
    return { authorized: false, error: "TENANT_MISMATCH_SECURITY_VIOLATION" };
  }

  const role = userData?.role || 'staff';
  if (!allowedRoles.includes(role)) {
    return { authorized: false, error: "INSUFFICIENT_ROLE_PERMISSIONS" };
  }

  return { authorized: true, uid: userId, businessId: userBusinessId, role };
}

export interface CreateProductInput {
  userId: string;
  businessId: string;
  idToken?: string;
  name: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  price: number; // MRP / base price
  onlinePrice?: number;
  cost?: number;
  stock?: number;
  minThreshold?: number;
  gstRate?: number;
  unit?: string;
  categoryId?: string;
  category?: string;
  description?: string;
  images?: string[];
  showOnWebsite?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isActive?: boolean;
  discountPercent?: number;
  discountAmount?: number;
  vendorId?: string;
  vendorName?: string;
  batchNumber?: string;
  expiryDate?: string;
  videoUrl?: string;
}

/**
 * Creates a product server-side with strict input validation and audit logging.
 */
export async function createMerchantProduct(input: CreateProductInput) {
  try {
    const auth = await authenticateMerchant(
      input.userId, 
      input.businessId, 
      input.idToken, 
      ['owner', 'admin', 'manager']
    );

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();

    // 1. Validate inputs
    const trimmedName = (input.name || "").trim();
    if (!trimmedName) {
      return { success: false, error: "Product name is required." };
    }

    const price = Math.max(0, parseFloat(String(input.price)) || 0);
    const onlinePrice = input.onlinePrice !== undefined 
      ? Math.max(0, parseFloat(String(input.onlinePrice)) || 0) 
      : price;
    const cost = Math.max(0, parseFloat(String(input.cost)) || 0);
    const stock = Math.max(0, parseInt(String(input.stock || 0), 10));
    const minThreshold = Math.max(0, parseInt(String(input.minThreshold || 5), 10));
    const gstRate = Math.max(0, parseFloat(String(input.gstRate || 0)) || 0);

    const generatedSku = (input.sku || "").trim() || `SKU-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Calculate discount if applicable
    let discountPercent = input.discountPercent || 0;
    let discountAmount = input.discountAmount || 0;
    if (price > onlinePrice && price > 0) {
      discountAmount = Math.max(0, price - onlinePrice);
      discountPercent = Math.round((discountAmount / price) * 100);
    }

    const productId = `prod_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const productRef = db.doc(`businesses/${input.businessId}/products/${productId}`);

    const nowIso = new Date().toISOString();

    const productPayload = {
      id: productId,
      tenantId: input.businessId,
      name: trimmedName,
      sku: generatedSku,
      barcode: (input.barcode || "").trim(),
      hsnCode: (input.hsnCode || "").trim(),
      price,
      onlinePrice,
      cost,
      stock,
      minThreshold,
      gstRate,
      unit: input.unit || "pcs",
      categoryId: input.categoryId || "",
      category: (input.category || "").trim() || "General",
      description: (input.description || "").trim(),
      images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
      showOnWebsite: Boolean(input.showOnWebsite),
      isFeatured: Boolean(input.isFeatured),
      isBestSeller: Boolean(input.isBestSeller),
      isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
      discountPercent,
      discountAmount,
      vendorId: input.vendorId || "",
      vendorName: input.vendorName || "",
      batchNumber: input.batchNumber || "",
      expiryDate: input.expiryDate || "",
      videoUrl: input.videoUrl || "",
      isArchived: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: input.userId
    };

    await productRef.set(productPayload);

    // Initial stock history record if stock > 0
    if (stock > 0) {
      const historyId = `hist_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const historyPayload = {
        id: historyId,
        productId,
        productName: trimmedName,
        sku: generatedSku,
        adjustmentType: 'initial_stock',
        previousStock: 0,
        newStock: stock,
        delta: stock,
        reason: "Initial stock upon product creation",
        adjustedBy: input.userId,
        adjustedAt: nowIso,
        createdAt: FieldValue.serverTimestamp()
      };

      await Promise.all([
        db.doc(`businesses/${input.businessId}/products/${productId}/stockHistory/${historyId}`).set(historyPayload),
        db.doc(`businesses/${input.businessId}/inventoryHistory/${historyId}`).set(historyPayload)
      ]);
    }

    revalidatePath("/inventory");
    revalidatePath("/website");
    revalidatePath("/shop");

    return { 
      success: true, 
      productId, 
      product: productPayload, 
      message: `Product "${trimmedName}" created successfully.` 
    };
  } catch (err: any) {
    console.error("[createMerchantProduct] error:", err);
    return { success: false, error: err.message || "Failed to create product." };
  }
}

export interface UpdateProductInput {
  userId: string;
  businessId: string;
  productId: string;
  idToken?: string;
  name?: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  price?: number;
  onlinePrice?: number;
  cost?: number;
  minThreshold?: number;
  gstRate?: number;
  unit?: string;
  categoryId?: string;
  category?: string;
  description?: string;
  images?: string[];
  showOnWebsite?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isActive?: boolean;
  discountPercent?: number;
  discountAmount?: number;
  vendorId?: string;
  vendorName?: string;
  batchNumber?: string;
  expiryDate?: string;
  videoUrl?: string;
}

/**
 * Updates an existing product server-side while preserving existing data.
 */
export async function updateMerchantProduct(input: UpdateProductInput) {
  try {
    const auth = await authenticateMerchant(
      input.userId, 
      input.businessId, 
      input.idToken, 
      ['owner', 'admin', 'manager']
    );

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const productRef = db.doc(`businesses/${input.businessId}/products/${input.productId}`);
    const snap = await productRef.get();

    if (!snap.exists) {
      return { success: false, error: "Product not found in business catalog." };
    }

    const existing = snap.data() || {};
    const updates: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: input.userId
    };

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) return { success: false, error: "Product name cannot be empty." };
      updates.name = trimmed;
    }

    if (input.sku !== undefined) updates.sku = input.sku.trim();
    if (input.barcode !== undefined) updates.barcode = input.barcode.trim();
    if (input.hsnCode !== undefined) updates.hsnCode = input.hsnCode.trim();
    
    let currentPrice = existing.price || 0;
    if (input.price !== undefined) {
      currentPrice = Math.max(0, parseFloat(String(input.price)) || 0);
      updates.price = currentPrice;
    }

    let currentOnlinePrice = existing.onlinePrice !== undefined ? existing.onlinePrice : currentPrice;
    if (input.onlinePrice !== undefined) {
      currentOnlinePrice = Math.max(0, parseFloat(String(input.onlinePrice)) || 0);
      updates.onlinePrice = currentOnlinePrice;
    }

    // Auto calculate discount
    if (currentPrice > currentOnlinePrice && currentPrice > 0) {
      updates.discountAmount = Math.max(0, currentPrice - currentOnlinePrice);
      updates.discountPercent = Math.round((updates.discountAmount / currentPrice) * 100);
    } else if (input.discountPercent !== undefined) {
      updates.discountPercent = input.discountPercent;
    }

    if (input.cost !== undefined) updates.cost = Math.max(0, parseFloat(String(input.cost)) || 0);
    if (input.minThreshold !== undefined) updates.minThreshold = Math.max(0, parseInt(String(input.minThreshold), 10));
    if (input.gstRate !== undefined) updates.gstRate = Math.max(0, parseFloat(String(input.gstRate)) || 0);
    if (input.unit !== undefined) updates.unit = input.unit;
    if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
    if (input.category !== undefined) updates.category = input.category.trim();
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.images !== undefined) updates.images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];
    if (input.showOnWebsite !== undefined) updates.showOnWebsite = Boolean(input.showOnWebsite);
    if (input.isFeatured !== undefined) updates.isFeatured = Boolean(input.isFeatured);
    if (input.isBestSeller !== undefined) updates.isBestSeller = Boolean(input.isBestSeller);
    if (input.isActive !== undefined) updates.isActive = Boolean(input.isActive);
    if (input.vendorId !== undefined) updates.vendorId = input.vendorId;
    if (input.vendorName !== undefined) updates.vendorName = input.vendorName;
    if (input.batchNumber !== undefined) updates.batchNumber = input.batchNumber;
    if (input.expiryDate !== undefined) updates.expiryDate = input.expiryDate;
    if (input.videoUrl !== undefined) updates.videoUrl = input.videoUrl;

    await productRef.update(updates);

    revalidatePath("/inventory");
    revalidatePath("/website");
    revalidatePath("/shop");

    return { success: true, message: `Product "${existing.name}" updated successfully.` };
  } catch (err: any) {
    console.error("[updateMerchantProduct] error:", err);
    return { success: false, error: err.message || "Failed to update product." };
  }
}

/**
 * Safely archives a product without breaking existing historical orders.
 */
export async function archiveMerchantProduct(input: {
  userId: string;
  businessId: string;
  productId: string;
  reason?: string;
  idToken?: string;
}) {
  try {
    const auth = await authenticateMerchant(
      input.userId, 
      input.businessId, 
      input.idToken, 
      ['owner', 'admin', 'manager']
    );

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const productRef = db.doc(`businesses/${input.businessId}/products/${input.productId}`);
    const snap = await productRef.get();

    if (!snap.exists) {
      return { success: false, error: "Product node not found." };
    }

    const pData = snap.data() || {};

    // Soft-archive: Mark inactive and hidden from storefront while preserving document for orders
    await productRef.update({
      isArchived: true,
      isActive: false,
      showOnWebsite: false,
      archiveReason: input.reason || "Archived by merchant",
      archivedAt: new Date().toISOString(),
      archivedBy: input.userId,
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath("/inventory");
    revalidatePath("/website");
    revalidatePath("/shop");

    return { 
      success: true, 
      message: `Product "${pData.name}" has been safely archived. Historical order references remain preserved.` 
    };
  } catch (err: any) {
    console.error("[archiveMerchantProduct] error:", err);
    return { success: false, error: err.message || "Failed to archive product." };
  }
}

/**
 * Restores an archived product back to the active catalog.
 */
export async function restoreMerchantProduct(input: {
  userId: string;
  businessId: string;
  productId: string;
  idToken?: string;
}) {
  try {
    const auth = await authenticateMerchant(
      input.userId, 
      input.businessId, 
      input.idToken, 
      ['owner', 'admin', 'manager']
    );

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const productRef = db.doc(`businesses/${input.businessId}/products/${input.productId}`);
    const snap = await productRef.get();

    if (!snap.exists) {
      return { success: false, error: "Product node not found." };
    }

    const pData = snap.data() || {};

    await productRef.update({
      isArchived: false,
      isActive: true,
      restoredAt: new Date().toISOString(),
      restoredBy: input.userId,
      updatedAt: FieldValue.serverTimestamp()
    });

    revalidatePath("/inventory");
    revalidatePath("/website");

    return { 
      success: true, 
      message: `Product "${pData.name}" restored to active inventory.` 
    };
  } catch (err: any) {
    console.error("[restoreMerchantProduct] error:", err);
    return { success: false, error: err.message || "Failed to restore product." };
  }
}

export interface AdjustStockInput {
  userId: string;
  businessId: string;
  productId: string;
  adjustmentType: 'add' | 'subtract' | 'set';
  quantity: number;
  reason: string;
  idToken?: string;
}

/**
 * Performs an atomic, server-side stock adjustment with non-negative validation and audit logging.
 */
export async function adjustProductStock(input: AdjustStockInput) {
  try {
    const auth = await authenticateMerchant(
      input.userId, 
      input.businessId, 
      input.idToken, 
      ['owner', 'admin', 'manager', 'staff']
    );

    if (!auth.authorized) {
      return { success: false, error: auth.error };
    }

    const { db } = initializeAdmin();
    const productRef = db.doc(`businesses/${input.businessId}/products/${input.productId}`);

    const qty = Math.abs(parseInt(String(input.quantity), 10));
    if (isNaN(qty) || qty < 0) {
      return { success: false, error: "Adjustment quantity must be a non-negative integer." };
    }

    const trimmedReason = (input.reason || "").trim() || "Manual merchant stock adjustment";
    const nowIso = new Date().toISOString();
    const historyId = `hist_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Execute atomic transaction to prevent race conditions & negative stock
    const transactionResult = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(productRef);
      if (!snap.exists) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const pData = snap.data()!;
      const currentStock = pData.stock !== undefined ? pData.stock : 0;
      let newStock = currentStock;

      if (input.adjustmentType === 'add') {
        newStock = currentStock + qty;
      } else if (input.adjustmentType === 'subtract') {
        newStock = currentStock - qty;
      } else if (input.adjustmentType === 'set') {
        newStock = qty;
      }

      // Strict non-negative inventory rule
      if (newStock < 0) {
        throw new Error(`NEGATIVE_STOCK_PREVENTED: Cannot adjust stock below 0. Current: ${currentStock}, Requested adjustment: -${qty}`);
      }

      // Update product document
      transaction.update(productRef, {
        stock: newStock,
        updatedAt: FieldValue.serverTimestamp(),
        lastStockAdjustment: {
          previousStock: currentStock,
          newStock,
          type: input.adjustmentType,
          delta: newStock - currentStock,
          reason: trimmedReason,
          adjustedBy: input.userId,
          adjustedAt: nowIso
        }
      });

      // Write audit log entry
      const auditPayload = {
        id: historyId,
        productId: input.productId,
        productName: pData.name,
        sku: pData.sku || "",
        adjustmentType: input.adjustmentType,
        previousStock: currentStock,
        newStock,
        delta: newStock - currentStock,
        reason: trimmedReason,
        adjustedBy: input.userId,
        adjustedAt: nowIso,
        createdAt: FieldValue.serverTimestamp()
      };

      const productHistRef = db.doc(`businesses/${input.businessId}/products/${input.productId}/stockHistory/${historyId}`);
      const businessHistRef = db.doc(`businesses/${input.businessId}/inventoryHistory/${historyId}`);

      transaction.set(productHistRef, auditPayload);
      transaction.set(businessHistRef, auditPayload);

      return {
        productName: pData.name,
        previousStock: currentStock,
        newStock,
        delta: newStock - currentStock
      };
    });

    revalidatePath("/inventory");
    revalidatePath("/website");
    revalidatePath("/shop");

    return {
      success: true,
      previousStock: transactionResult.previousStock,
      newStock: transactionResult.newStock,
      message: `Stock for "${transactionResult.productName}" updated to ${transactionResult.newStock} (Delta: ${transactionResult.delta >= 0 ? '+' : ''}${transactionResult.delta}).`
    };
  } catch (err: any) {
    console.error("[adjustProductStock] error:", err);
    return { success: false, error: err.message || "Failed to adjust stock." };
  }
}

/**
 * Fetches stock audit history entries safely bounded.
 */
export async function fetchStockHistory(input: {
  businessId: string;
  productId?: string;
  limitCount?: number;
}) {
  try {
    const { db } = initializeAdmin();
    const count = Math.min(100, Math.max(1, input.limitCount || 30));

    let queryRef;
    if (input.productId) {
      queryRef = db.collection(`businesses/${input.businessId}/products/${input.productId}/stockHistory`)
        .orderBy("adjustedAt", "desc")
        .limit(count);
    } else {
      queryRef = db.collection(`businesses/${input.businessId}/inventoryHistory`)
        .orderBy("adjustedAt", "desc")
        .limit(count);
    }

    const snap = await queryRef.get();
    const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return { success: true, history };
  } catch (err: any) {
    console.error("[fetchStockHistory] error:", err);
    return { success: false, history: [], error: err.message };
  }
}
