--
-- PostgreSQL database dump
--

\restrict hKMsRvFX1d6LnTny95cJAFg8EWj9L7XjKB0dyWdAWyF7VZapQQATH4f814qdGxV

-- Dumped from database version 15.15 (Homebrew)
-- Dumped by pg_dump version 15.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AssignmentEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssignmentEventType" AS ENUM (
    'ASSIGN',
    'REASSIGN',
    'UNASSIGN'
);


--
-- Name: AuditMismatchType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuditMismatchType" AS ENUM (
    'SHORT',
    'EXCESS',
    'MATCH'
);


--
-- Name: AuditReason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuditReason" AS ENUM (
    'DAMAGE',
    'EXPIRED_DISPOSAL',
    'SPILLAGE',
    'THEFT_LOSS',
    'MIS_PICK_MIS_ISSUE',
    'SUPPLIER_SHORT',
    'RETURN_PENDING',
    'DATA_ENTRY_ERROR',
    'OTHER'
);


--
-- Name: AuditRootCause; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuditRootCause" AS ENUM (
    'PROCESS',
    'DATA',
    'HANDLING',
    'SUPPLIER',
    'OTHER'
);


--
-- Name: AuditStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuditStatus" AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'CANCELLED'
);


--
-- Name: AuditTaskStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuditTaskStatus" AS ENUM (
    'OPEN',
    'DONE'
);


--
-- Name: DistributorStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DistributorStatus" AS ENUM (
    'PENDING',
    'ACTIVE'
);


--
-- Name: InboundOrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InboundOrderStatus" AS ENUM (
    'CREATED',
    'CONFIRMED',
    'PACKED',
    'DISPATCHED',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'PAYMENT_VERIFIED'
);


--
-- Name: InventoryTxnType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InventoryTxnType" AS ENUM (
    'INBOUND',
    'RESERVE',
    'UNRESERVE',
    'DISPATCH',
    'RETURN',
    'DAMAGE',
    'ADJUSTMENT',
    'TRANSFER_OUT',
    'TRANSFER_IN'
);


--
-- Name: InvoiceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvoiceType" AS ENUM (
    'DISTRIBUTOR',
    'RETAILER'
);


--
-- Name: LedgerType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LedgerType" AS ENUM (
    'DEBIT',
    'CREDIT'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'SUBMITTED',
    'CONFIRMED',
    'REJECTED',
    'CANCELLED',
    'DISPATCHED',
    'DELIVERED'
);


--
-- Name: OwnerType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OwnerType" AS ENUM (
    'COMPANY',
    'DISTRIBUTOR',
    'RETAILER'
);


--
-- Name: PaymentMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentMode" AS ENUM (
    'CASH',
    'UPI',
    'BANK_TRANSFER',
    'CHEQUE'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIAL',
    'PAID'
);


--
-- Name: ReceiveStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReceiveStatus" AS ENUM (
    'RECEIVED',
    'PARTIAL_RECEIVED'
);


--
-- Name: RetailerStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RetailerStatus" AS ENUM (
    'PENDING',
    'ACTIVE'
);


--
-- Name: RewardRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RewardRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'FULFILLED'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'HR',
    'STATE_BUSINESS_HEAD',
    'SALES_MANAGER',
    'WAREHOUSE_MANAGER',
    'DISTRIBUTOR',
    'FIELD_OFFICER',
    'RETAILER'
);


--
-- Name: ShippingMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ShippingMode" AS ENUM (
    'COURIER',
    'TRANSPORT',
    'SELF'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Distributor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Distributor" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    gst text,
    address text,
    city text,
    state text NOT NULL,
    pincode text,
    status public."DistributorStatus" DEFAULT 'PENDING'::public."DistributorStatus" NOT NULL,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "salesManagerId" text,
    district text,
    "defaultFoUserId" text
);


--
-- Name: DistributorProductRate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DistributorProductRate" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "productName" text NOT NULL,
    "saleRate" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FieldOfficerRetailerMap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FieldOfficerRetailerMap" (
    id text NOT NULL,
    "foUserId" text NOT NULL,
    "retailerId" text NOT NULL,
    "distributorId" text,
    "assignedByUserId" text,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "unassignedAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL,
    note text
);


--
-- Name: FieldOfficerTarget; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FieldOfficerTarget" (
    id text NOT NULL,
    "foUserId" text NOT NULL,
    "monthKey" text NOT NULL,
    "targetValue" double precision NOT NULL,
    locked boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FoMonthlyTarget; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FoMonthlyTarget" (
    id text NOT NULL,
    "foUserId" text NOT NULL,
    "monthKey" text NOT NULL,
    "targetAmt" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: FoPointsLedger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FoPointsLedger" (
    id text NOT NULL,
    "foUserId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type text NOT NULL,
    points integer NOT NULL,
    reason text,
    "refType" text,
    "refId" text,
    "metaJson" jsonb
);


--
-- Name: InboundDispatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InboundDispatch" (
    id text NOT NULL,
    "inboundOrderId" text NOT NULL,
    "createdByUserId" text,
    "dispatchDate" timestamp(3) without time zone NOT NULL,
    "shippingMode" public."ShippingMode" NOT NULL,
    "carrierName" text NOT NULL,
    "trackingNo" text NOT NULL,
    "lrNo" text,
    parcels integer DEFAULT 1 NOT NULL,
    "driverName" text,
    "driverPhone" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InboundDispatchItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InboundDispatchItem" (
    id text NOT NULL,
    "inboundDispatchId" text NOT NULL,
    "inboundOrderItemId" text NOT NULL,
    "productName" text NOT NULL,
    "orderedQtyPcs" integer NOT NULL,
    "dispatchQtyPcs" integer NOT NULL,
    "batchNo" text NOT NULL,
    "mfgDate" timestamp(3) without time zone NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL
);


--
-- Name: InboundOrder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InboundOrder" (
    id text NOT NULL,
    "orderNo" text NOT NULL,
    "forDistributorId" text NOT NULL,
    "createdByUserId" text NOT NULL,
    status public."InboundOrderStatus" DEFAULT 'CREATED'::public."InboundOrderStatus" NOT NULL,
    "expectedAt" timestamp(3) without time zone,
    "trackingCarrier" text,
    "trackingNo" text,
    "trackingUrl" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "courierName" text,
    "dispatchDate" timestamp(3) without time zone,
    "lrNo" text,
    "shippingMode" public."ShippingMode",
    "transportName" text,
    "paymentStatus" public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    "paymentMode" public."PaymentMode",
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "utrNo" text,
    "paidAt" timestamp(3) without time zone,
    "paymentRemarks" text,
    "paymentEnteredByUserId" text,
    "paymentVerified" boolean DEFAULT false NOT NULL,
    "paymentVerifiedAt" timestamp(3) without time zone,
    "paymentVerifiedByUserId" text,
    "dispatchedAt" timestamp(3) without time zone,
    "dispatchedByUserId" text
);


--
-- Name: InboundOrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InboundOrderItem" (
    id text NOT NULL,
    "inboundOrderId" text NOT NULL,
    "orderedQtyPcs" integer NOT NULL,
    "productName" text NOT NULL,
    "batchNo" text,
    "expiryDate" timestamp(3) without time zone,
    "mfgDate" timestamp(3) without time zone,
    rate double precision
);


--
-- Name: InboundReceive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InboundReceive" (
    id text NOT NULL,
    "inboundOrderId" text NOT NULL,
    "distributorId" text NOT NULL,
    status public."ReceiveStatus" NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "receivedByUserId" text NOT NULL
);


--
-- Name: InboundReceiveItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InboundReceiveItem" (
    id text NOT NULL,
    "inboundReceiveId" text NOT NULL,
    "orderedQtyPcs" integer NOT NULL,
    "receivedQtyPcs" integer NOT NULL,
    "shortQtyPcs" integer NOT NULL,
    "productName" text NOT NULL
);


--
-- Name: Inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Inventory" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "productName" text NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryAdjustmentTxn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryAdjustmentTxn" (
    id text NOT NULL,
    "warehouseId" text NOT NULL,
    "refType" text NOT NULL,
    "refId" text NOT NULL,
    "productName" text NOT NULL,
    "batchNo" text,
    "deltaQty" integer NOT NULL,
    reason text,
    notes text,
    "actorUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: InventoryBatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryBatch" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "productName" text NOT NULL,
    "batchNo" text NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    qty integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "mfgDate" timestamp(3) without time zone
);


--
-- Name: InventorySnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventorySnapshot" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "productName" text NOT NULL,
    "availableQty" integer DEFAULT 0 NOT NULL,
    "reservedQty" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: InventoryTxn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryTxn" (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "distributorId" text NOT NULL,
    "productName" text NOT NULL,
    type public."InventoryTxnType" NOT NULL,
    "qtyChange" integer NOT NULL,
    "qtyReservedChange" integer DEFAULT 0 NOT NULL,
    "refType" text,
    "refId" text,
    note text,
    "actorUserId" text,
    "actorRole" text
);


--
-- Name: InventoryTxnBatchMap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryTxnBatchMap" (
    id text NOT NULL,
    "txnId" text NOT NULL,
    "batchId" text NOT NULL,
    "qtyUsed" integer NOT NULL
);


--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    "invoiceNo" text NOT NULL,
    "distributorId" text NOT NULL,
    "retailerId" text,
    "orderId" text,
    "totalAmount" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "invoiceType" public."InvoiceType" DEFAULT 'RETAILER'::public."InvoiceType" NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "paymentMode" public."PaymentMode",
    "paymentStatus" public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    remarks text,
    "utrNo" text
);


--
-- Name: InvoiceItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InvoiceItem" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "productName" text NOT NULL,
    qty integer NOT NULL,
    rate double precision NOT NULL,
    amount double precision NOT NULL,
    "batchNo" text NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    "mfgDate" timestamp(3) without time zone
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "orderNo" text NOT NULL,
    "distributorId" text NOT NULL,
    "retailerId" text NOT NULL,
    status public."OrderStatus" DEFAULT 'SUBMITTED'::public."OrderStatus" NOT NULL,
    "totalAmount" double precision DEFAULT 0 NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "appVersion" text,
    "clientRequestHash" text,
    "deviceId" text,
    "idempotencyKey" text,
    "requestReceivedAt" timestamp(3) without time zone
);


--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productName" text NOT NULL,
    qty integer NOT NULL,
    rate double precision NOT NULL,
    amount double precision NOT NULL
);


--
-- Name: OrderRequestLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderRequestLog" (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    endpoint text NOT NULL,
    "requestId" text,
    "idempotencyKey" text NOT NULL,
    "clientRequestHash" text,
    "userId" text,
    "retailerId" text,
    "distributorId" text,
    "deviceId" text,
    result text NOT NULL,
    "orderId" text,
    error text
);


--
-- Name: ProductCatalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductCatalog" (
    id text NOT NULL,
    name text NOT NULL,
    barcode text,
    hsn text,
    mrp double precision,
    "salePrice" double precision,
    "gstRate" double precision,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Retailer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Retailer" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    phone text,
    gst text,
    address text,
    city text,
    state text,
    pincode text,
    status public."RetailerStatus" DEFAULT 'PENDING'::public."RetailerStatus" NOT NULL,
    "distributorId" text,
    "createdByRole" public."Role" NOT NULL,
    "createdById" text NOT NULL,
    "activatedByDistributorId" text,
    "activatedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    district text
);


--
-- Name: RetailerAssignmentActive; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RetailerAssignmentActive" (
    id text NOT NULL,
    "retailerId" text NOT NULL,
    "foUserId" text NOT NULL,
    "distributorId" text NOT NULL,
    "assignedByUserId" text,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    note text
);


--
-- Name: RetailerAssignmentHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RetailerAssignmentHistory" (
    id text NOT NULL,
    "retailerId" text NOT NULL,
    "fromFoUserId" text,
    "toFoUserId" text,
    "distributorId" text,
    "eventType" public."AssignmentEventType" NOT NULL,
    reason text,
    "actorUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RetailerLedger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RetailerLedger" (
    id text NOT NULL,
    "retailerId" text NOT NULL,
    "distributorId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type public."LedgerType" NOT NULL,
    amount double precision NOT NULL,
    reference text,
    narration text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RetailerStockAudit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RetailerStockAudit" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "fieldOfficerId" text NOT NULL,
    "retailerId" text NOT NULL,
    "auditDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: RetailerStockAuditItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RetailerStockAuditItem" (
    id text NOT NULL,
    "auditId" text NOT NULL,
    "productName" text NOT NULL,
    "batchNo" text,
    "expiryDate" timestamp(3) without time zone,
    "systemQty" integer NOT NULL,
    "physicalQty" integer NOT NULL,
    variance integer NOT NULL
);


--
-- Name: RetailerStockBatch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RetailerStockBatch" (
    id text NOT NULL,
    "retailerId" text NOT NULL,
    "productName" text NOT NULL,
    "batchNo" text NOT NULL,
    "expiryDate" timestamp(3) without time zone NOT NULL,
    qty integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RetailerStockSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RetailerStockSnapshot" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "retailerId" text NOT NULL,
    "productName" text NOT NULL,
    "batchNo" text,
    "expiryDate" timestamp(3) without time zone,
    qty integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RewardCatalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RewardCatalog" (
    id text NOT NULL,
    title text NOT NULL,
    subtitle text,
    "pointsCost" integer NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "imageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RewardRedeemRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RewardRedeemRequest" (
    id text NOT NULL,
    "foUserId" text NOT NULL,
    "rewardId" text NOT NULL,
    status public."RewardRequestStatus" DEFAULT 'PENDING'::public."RewardRequestStatus" NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SalesTarget; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SalesTarget" (
    id text NOT NULL,
    month text NOT NULL,
    "targetAmount" integer NOT NULL,
    "assignedById" text,
    "fieldOfficerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockAudit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockAudit" (
    id text NOT NULL,
    "warehouseId" text NOT NULL,
    "monthKey" text NOT NULL,
    "auditDate" timestamp(3) without time zone NOT NULL,
    "snapshotAt" timestamp(3) without time zone NOT NULL,
    status public."AuditStatus" DEFAULT 'DRAFT'::public."AuditStatus" NOT NULL,
    "totalSystemQty" integer DEFAULT 0 NOT NULL,
    "totalPhysicalQty" integer DEFAULT 0 NOT NULL,
    "totalVarianceQty" integer DEFAULT 0 NOT NULL,
    "investigationQtyThreshold" integer DEFAULT 20 NOT NULL,
    "investigationPctThreshold" double precision DEFAULT 2.0 NOT NULL,
    "createdByUserId" text,
    "submittedByUserId" text,
    "approvedByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockAuditLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockAuditLine" (
    id text NOT NULL,
    "auditId" text NOT NULL,
    "productName" text NOT NULL,
    "batchNo" text,
    "mfgDate" timestamp(3) without time zone,
    "expDate" timestamp(3) without time zone,
    "systemQty" integer NOT NULL,
    "physicalQty" integer,
    "diffQty" integer,
    "mismatchType" public."AuditMismatchType" DEFAULT 'MATCH'::public."AuditMismatchType" NOT NULL,
    reason public."AuditReason",
    "rootCause" public."AuditRootCause",
    remarks text,
    "needsInvestigation" boolean DEFAULT false NOT NULL,
    "isRepeatIssue" boolean DEFAULT false NOT NULL,
    "evidenceUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockAuditTask; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockAuditTask" (
    id text NOT NULL,
    "auditId" text NOT NULL,
    title text NOT NULL,
    "assignedToUserId" text,
    "dueDate" timestamp(3) without time zone,
    status public."AuditTaskStatus" DEFAULT 'OPEN'::public."AuditTaskStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockLot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockLot" (
    id text NOT NULL,
    "ownerType" public."OwnerType" NOT NULL,
    "ownerId" text,
    "batchNo" text,
    "expDate" timestamp(3) without time zone,
    "qtyOnHandPcs" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "productName" text NOT NULL,
    "mfgDate" timestamp(3) without time zone
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."Role" NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    address text,
    city text,
    state text,
    pincode text,
    "distributorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    district text
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: Distributor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Distributor" (id, code, name, phone, gst, address, city, state, pincode, status, "userId", "createdAt", "updatedAt", "salesManagerId", district, "defaultFoUserId") FROM stdin;
cmlrx8gck0006sv7zf3wl8k22	BSD13324251	Vinay	8721967609	02potps3565r1zc	\N	Pimpri-chinchwad	Maharashtra	411027	PENDING	cmlrx8gcr0008sv7zs9ckqels	2026-02-18 11:00:47.684	2026-02-18 11:00:47.692	cmlrs15x900019dphgbu86n9b	Pune	\N
cmlrx9dzl000bsv7z6bjuly9l	BSD64996512	Savita	9041760000	03potps4565r1zc	\N	Abohar	Punjab	152116	PENDING	cmlrx9dzm000dsv7z4c9xs1o2	2026-02-18 11:01:31.281	2026-02-18 11:01:31.283	cmlrs15x900019dphgbu86n9b	Firozpur	\N
\.


--
-- Data for Name: DistributorProductRate; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DistributorProductRate" (id, "distributorId", "productName", "saleRate", "createdAt", "updatedAt") FROM stdin;
cmls0oujm0027sv7z8t9nrnp4	cmlrx8gck0006sv7zf3wl8k22	BeautSoul Bamboo Tooth Brush	60	2026-02-18 12:37:31.426	2026-02-18 12:37:31.426
cmls0ozj70028sv7zian1sqk1	cmlrx8gck0006sv7zf3wl8k22	BeautSoul Rose Water Face Toner 100ml	75	2026-02-18 12:37:37.891	2026-02-18 12:37:37.891
cmls0p5d40029sv7za3w49n95	cmlrx8gck0006sv7zf3wl8k22	BeautSoul SunScreen Gel	162	2026-02-18 12:37:45.449	2026-02-18 12:37:45.449
cmls0pch9002asv7zwa6hnxfn	cmlrx8gck0006sv7zf3wl8k22	BeautSoul SunScreen Sun Shield 50g	162	2026-02-18 12:37:54.669	2026-02-18 12:37:54.669
\.


--
-- Data for Name: FieldOfficerRetailerMap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FieldOfficerRetailerMap" (id, "foUserId", "retailerId", "distributorId", "assignedByUserId", "assignedAt", "unassignedAt", "isActive", note) FROM stdin;
\.


--
-- Data for Name: FieldOfficerTarget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FieldOfficerTarget" (id, "foUserId", "monthKey", "targetValue", locked, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FoMonthlyTarget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FoMonthlyTarget" (id, "foUserId", "monthKey", "targetAmt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FoPointsLedger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FoPointsLedger" (id, "foUserId", date, type, points, reason, "refType", "refId", "metaJson") FROM stdin;
cmlsdr7us0005aigc46f38l8e	cmlrzef8w001jsv7zjx50udui	2026-02-18 18:43:16.997	EARN	19	COLLECTION	ledger	cmlsdr7um0003aigcbhhaq7q1	{"mode": "CASH", "amount": 1497, "retailerId": "cmlryj1vy000isv7z9eo8pk51"}
cmlsdrv4o0009aigc2vbc72t2	cmlrzef8w001jsv7zjx50udui	2026-02-18 18:43:47.16	EARN	19	COLLECTION	ledger	cmlsdrv4l0007aigcytyy2opt	{"mode": "CASH", "amount": 1497, "retailerId": "cmlrzam06001csv7zr5vt153r"}
cmlsdsc63000daigc7cb26tqi	cmlrzef8w001jsv7zjx50udui	2026-02-18 18:44:09.243	EARN	8	COLLECTION	ledger	cmlsdsc60000baigcnelecnko	{"mode": "CASH", "amount": 399, "retailerId": "cmlrysyk0000ssv7zvaovs2rd"}
cmlsdtylf000haigcgt3fi3ho	cmlrzef8w001jsv7zjx50udui	2026-02-18 18:45:24.963	EARN	35	COLLECTION	ledger	cmlsdtylc000faigcy3zyyfk0	{"mode": "UPI", "amount": 3099, "retailerId": "cmlrzd9jb001hsv7zy53cma4z"}
cmlsduepr000laigcdiq0rb8c	cmlrzef8w001jsv7zjx50udui	2026-02-18 18:45:45.856	EARN	19	COLLECTION	ledger	cmlsduepo000jaigcd44kqqk6	{"mode": "CASH", "amount": 1497, "retailerId": "cmlrz8o9p0017sv7z3lxhgc78"}
cmltutrk3001pc6cf1piw4t8t	cmlrzef8w001jsv7zjx50udui	2026-02-19 19:28:55.491	EARN	19	COLLECTION	ledger	cmltutrjy001nc6cf6bxqwjk3	{"mode": "CASH", "amount": 1497, "retailerId": "cmlryj1vy000isv7z9eo8pk51"}
\.


--
-- Data for Name: InboundDispatch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InboundDispatch" (id, "inboundOrderId", "createdByUserId", "dispatchDate", "shippingMode", "carrierName", "trackingNo", "lrNo", parcels, "driverName", "driverPhone", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: InboundDispatchItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InboundDispatchItem" (id, "inboundDispatchId", "inboundOrderItemId", "productName", "orderedQtyPcs", "dispatchQtyPcs", "batchNo", "mfgDate", "expiryDate") FROM stdin;
\.


--
-- Data for Name: InboundOrder; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InboundOrder" (id, "orderNo", "forDistributorId", "createdByUserId", status, "expectedAt", "trackingCarrier", "trackingNo", "trackingUrl", notes, "createdAt", "updatedAt", "courierName", "dispatchDate", "lrNo", "shippingMode", "transportName", "paymentStatus", "paymentMode", "paidAmount", "utrNo", "paidAt", "paymentRemarks", "paymentEnteredByUserId", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedByUserId", "dispatchedAt", "dispatchedByUserId") FROM stdin;
cmlrznfdr001lsv7zvykzyybu	SMO5507420545	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	DISPATCHED	\N	\N	\N	\N	\N	2026-02-18 12:08:25.504	2026-02-18 12:34:14.191	\N	2026-02-18 12:33:00	\N	SELF	\N	PAID	UPI	24696	555555555	2026-02-18 12:08:37.786	\N	cmlrs15x900019dphgbu86n9b	t	2026-02-18 12:11:51.691	cmlrs15z700029dphg79wh0ui	\N	\N
\.


--
-- Data for Name: InboundOrderItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InboundOrderItem" (id, "inboundOrderId", "orderedQtyPcs", "productName", "batchNo", "expiryDate", "mfgDate", rate) FROM stdin;
cmlrznfdr001msv7zio0t1a77	cmlrznfdr001lsv7zvykzyybu	120	BeautSoul Bamboo Tooth Brush	\N	\N	\N	50
cmlrznfdr001nsv7z7d3iku60	cmlrznfdr001lsv7zvykzyybu	70	BeautSoul Rose Water Face Toner 100ml	\N	\N	\N	75
cmlrznfdr001osv7z7dw26bmi	cmlrznfdr001lsv7zvykzyybu	48	BeautSoul SunScreen Sun Shield 50g	\N	\N	\N	124.5
cmlrznfdr001psv7z2jsp8w7q	cmlrznfdr001lsv7zvykzyybu	60	BeautSoul SunScreen Gel	\N	\N	\N	124.5
\.


--
-- Data for Name: InboundReceive; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InboundReceive" (id, "inboundOrderId", "distributorId", status, "receivedAt", "receivedByUserId") FROM stdin;
\.


--
-- Data for Name: InboundReceiveItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InboundReceiveItem" (id, "inboundReceiveId", "orderedQtyPcs", "receivedQtyPcs", "shortQtyPcs", "productName") FROM stdin;
\.


--
-- Data for Name: Inventory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Inventory" (id, "distributorId", "productName", qty, "updatedAt") FROM stdin;
cmls0jkni001wsv7zlkd6w56r	cmlrx8gck0006sv7zf3wl8k22	BeautSoul Bamboo Tooth Brush	47	2026-02-19 19:28:08.103
cmls0jknm001ysv7zhs0meu12	cmlrx8gck0006sv7zf3wl8k22	BeautSoul Rose Water Face Toner 100ml	38	2026-02-19 19:28:08.106
cmls0jknq0022sv7z7fdynsyq	cmlrx8gck0006sv7zf3wl8k22	BeautSoul SunScreen Gel	35	2026-02-19 19:28:08.109
cmls0jkno0020sv7zlzsdy85m	cmlrx8gck0006sv7zf3wl8k22	BeautSoul SunScreen Sun Shield 50g	23	2026-02-19 19:28:08.111
\.


--
-- Data for Name: InventoryAdjustmentTxn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryAdjustmentTxn" (id, "warehouseId", "refType", "refId", "productName", "batchNo", "deltaQty", reason, notes, "actorUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: InventoryBatch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryBatch" (id, "distributorId", "productName", "batchNo", "expiryDate", qty, "createdAt", "updatedAt", "mfgDate") FROM stdin;
cmls0jknd001vsv7zkxcr5xjw	cmlrx8gck0006sv7zf3wl8k22	BeautSoul Bamboo Tooth Brush	BT001`	2029-12-31 00:00:00	47	2026-02-18 12:33:25.322	2026-02-19 19:28:08.102	2026-01-01 00:00:00
cmls0jknm001xsv7zlfux8lub	cmlrx8gck0006sv7zf3wl8k22	BeautSoul Rose Water Face Toner 100ml	S680	2027-05-31 00:00:00	38	2026-02-18 12:33:25.33	2026-02-19 19:28:08.106	2025-06-01 00:00:00
cmls0jknp0021sv7z9js3s4tv	cmlrx8gck0006sv7zf3wl8k22	BeautSoul SunScreen Gel	S712	2027-06-30 00:00:00	35	2026-02-18 12:33:25.334	2026-02-19 19:28:08.108	2025-07-01 00:00:00
cmls0jkno001zsv7zezus8kua	cmlrx8gck0006sv7zf3wl8k22	BeautSoul SunScreen Sun Shield 50g	SC/6/2	2027-05-31 00:00:00	23	2026-02-18 12:33:25.332	2026-02-19 19:28:08.111	2025-06-01 00:00:00
\.


--
-- Data for Name: InventorySnapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventorySnapshot" (id, "distributorId", "productName", "availableQty", "reservedQty", "updatedAt") FROM stdin;
\.


--
-- Data for Name: InventoryTxn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryTxn" (id, "createdAt", "distributorId", "productName", type, "qtyChange", "qtyReservedChange", "refType", "refId", note, "actorUserId", "actorRole") FROM stdin;
\.


--
-- Data for Name: InventoryTxnBatchMap; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryTxnBatchMap" (id, "txnId", "batchId", "qtyUsed") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Invoice" (id, "invoiceNo", "distributorId", "retailerId", "orderId", "totalAmount", "createdAt", "invoiceType", "paidAmount", "paidAt", "paymentMode", "paymentStatus", remarks, "utrNo") FROM stdin;
cmls1euzy0034sv7zqoayhnc2	INV1771419465069	cmlrx8gck0006sv7zf3wl8k22	cmlrzd9jb001hsv7zy53cma4z	65de6973-2c76-4986-90cf-3979aa8830f9	3099	2026-02-18 12:57:45.07	RETAILER	0	\N	\N	UNPAID	\N	\N
cmls1fgfi003lsv7zelie6su0	INV1771419492845	cmlrx8gck0006sv7zf3wl8k22	cmlryzj3k0012sv7zs98xk48h	4770ee96-ee11-4bc8-85c2-6ee8222b542f	2697	2026-02-18 12:58:12.846	RETAILER	0	\N	\N	UNPAID	\N	\N
cmls1fw1x0042sv7zsin41p1f	INV1771419513093	cmlrx8gck0006sv7zf3wl8k22	cmlrz8o9p0017sv7z3lxhgc78	6450a92d-e5d1-4e8b-8fcb-f96b3b69bf6c	1497	2026-02-18 12:58:33.093	RETAILER	0	\N	\N	UNPAID	\N	\N
cmls1g75g004jsv7zpvqoi2c4	INV1771419527475	cmlrx8gck0006sv7zf3wl8k22	cmlrysyk0000ssv7zvaovs2rd	6a4e7265-ce2d-40d8-85c4-2e7e70b8c9cc	399	2026-02-18 12:58:47.476	RETAILER	0	\N	\N	UNPAID	\N	\N
cmls1gtsf005esv7zefteccq4	INV1771419556815	cmlrx8gck0006sv7zf3wl8k22	cmlrzam06001csv7zr5vt153r	22105440-f824-4ab9-a3f5-cb21890f993d	1497	2026-02-18 12:59:16.816	RETAILER	0	\N	\N	UNPAID	\N	\N
cmltry93k0007c6cfn87x5eid	INV1771524506000	cmlrx8gck0006sv7zf3wl8k22	cmltfo7vn0007bt8fwt50epqn	84e411b4-741a-447c-bb84-f7e553ee88d2	2697	2026-02-19 18:08:26	RETAILER	0	\N	\N	UNPAID	\N	\N
cmls1gid8004xsv7zqs1386g5	INV1771419542012	cmlrx8gck0006sv7zf3wl8k22	cmlryj1vy000isv7z9eo8pk51	\N	1497	2026-02-18 12:59:02.013	RETAILER	0	\N	\N	UNPAID	\N	\N
cmltusqzl0017c6cfwl6xvqpa	INV1771529288097	cmlrx8gck0006sv7zf3wl8k22	cmlryj1vy000isv7z9eo8pk51	f591a909-fa88-4b70-a621-42b9d1bb4a7d	1497	2026-02-19 19:28:08.098	RETAILER	0	\N	\N	UNPAID	\N	\N
\.


--
-- Data for Name: InvoiceItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InvoiceItem" (id, "invoiceId", "productName", qty, rate, amount, "batchNo", "expiryDate", "mfgDate") FROM stdin;
cmls1ev060036sv7zt5ujaixr	cmls1euzy0034sv7zqoayhnc2	BeautSoul Bamboo Tooth Brush	3	60	180	BT001`	2029-12-31 00:00:00	2026-01-01 00:00:00
cmls1ev0c0039sv7zk8nixfdb	cmls1euzy0034sv7zqoayhnc2	BeautSoul Rose Water Face Toner 100ml	13	75	975	S680	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1ev0e003csv7zb5arkhpf	cmls1euzy0034sv7zqoayhnc2	BeautSoul SunScreen Sun Shield 50g	6	162	972	SC/6/2	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1ev0h003fsv7zmynvs2wt	cmls1euzy0034sv7zqoayhnc2	BeautSoul SunScreen Gel	6	162	972	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmls1fgfm003nsv7zwnpub1q6	cmls1fgfi003lsv7zelie6su0	BeautSoul Bamboo Tooth Brush	25	60	1500	BT001`	2029-12-31 00:00:00	2026-01-01 00:00:00
cmls1fgfq003qsv7zv990xnam	cmls1fgfi003lsv7zelie6su0	BeautSoul Rose Water Face Toner 100ml	3	75	225	S680	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1fgft003tsv7zp6i49ae8	cmls1fgfi003lsv7zelie6su0	BeautSoul SunScreen Gel	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmls1fgfw003wsv7zd1lbbsiw	cmls1fgfi003lsv7zelie6su0	BeautSoul SunScreen Sun Shield 50g	3	162	486	SC/6/2	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1fw1z0044sv7zn4qiw1up	cmls1fw1x0042sv7zsin41p1f	BeautSoul Bamboo Tooth Brush	5	60	300	BT001`	2029-12-31 00:00:00	2026-01-01 00:00:00
cmls1fw210047sv7zogmsx575	cmls1fw1x0042sv7zsin41p1f	BeautSoul Rose Water Face Toner 100ml	3	75	225	S680	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1fw25004asv7zmge0pk65	cmls1fw1x0042sv7zsin41p1f	BeautSoul SunScreen Gel	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmls1fw27004dsv7z6d0302l5	cmls1fw1x0042sv7zsin41p1f	BeautSoul SunScreen Sun Shield 50g	3	162	486	SC/6/2	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1g75i004lsv7za6f52g20	cmls1g75g004jsv7zpvqoi2c4	BeautSoul Rose Water Face Toner 100ml	1	75	75	S680	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1g75l004osv7zode2mwoz	cmls1g75g004jsv7zpvqoi2c4	BeautSoul SunScreen Gel	1	162	162	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmls1g75o004rsv7zhc6rhw8l	cmls1g75g004jsv7zpvqoi2c4	BeautSoul SunScreen Sun Shield 50g	1	162	162	SC/6/2	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1gida004zsv7z1m7c9gba	cmls1gid8004xsv7zqs1386g5	BeautSoul Bamboo Tooth Brush	5	60	300	BT001`	2029-12-31 00:00:00	2026-01-01 00:00:00
cmls1gide0052sv7zd9zj1vbj	cmls1gid8004xsv7zqs1386g5	BeautSoul Rose Water Face Toner 100ml	3	75	225	S680	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1gidg0055sv7zxrydzm8n	cmls1gid8004xsv7zqs1386g5	BeautSoul SunScreen Gel	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmls1gidj0058sv7zti1gchgr	cmls1gid8004xsv7zqs1386g5	BeautSoul SunScreen Sun Shield 50g	3	162	486	SC/6/2	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1gtsh005gsv7zcqb0aqxo	cmls1gtsf005esv7zefteccq4	BeautSoul Bamboo Tooth Brush	5	60	300	BT001`	2029-12-31 00:00:00	2026-01-01 00:00:00
cmls1gtsl005jsv7ztrkvrpa0	cmls1gtsf005esv7zefteccq4	BeautSoul Rose Water Face Toner 100ml	3	75	225	S680	2027-05-31 00:00:00	2025-06-01 00:00:00
cmls1gtsn005msv7z7pw57fax	cmls1gtsf005esv7zefteccq4	BeautSoul SunScreen Gel	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmls1gtsq005psv7zn1u0impn	cmls1gtsf005esv7zefteccq4	BeautSoul SunScreen Sun Shield 50g	3	162	486	SC/6/2	2027-05-31 00:00:00	2025-06-01 00:00:00
cmltry93n0009c6cf3baalq30	cmltry93k0007c6cfn87x5eid	BeautSoul Bamboo Tooth Brush	25	60	1500	BT001`	2029-12-31 00:00:00	2026-01-01 00:00:00
cmltry93s000cc6cfkylmru84	cmltry93k0007c6cfn87x5eid	BeautSoul Rose Water Face Toner 100ml	3	75	225	S680	2027-05-31 00:00:00	2025-06-01 00:00:00
cmltry93u000fc6cf7s33m2ox	cmltry93k0007c6cfn87x5eid	BeautSoul SunScreen Gel	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmltry93x000ic6cf30b35f2f	cmltry93k0007c6cfn87x5eid	BeautSoul SunScreen Sun Shield 50g	3	162	486	SC/6/2	2027-05-31 00:00:00	2025-06-01 00:00:00
cmltusqzp0019c6cfyqkj1qi8	cmltusqzl0017c6cfwl6xvqpa	BeautSoul Bamboo Tooth Brush	5	60	300	BT001`	2029-12-31 00:00:00	2026-01-01 00:00:00
cmltusqzt001cc6cffkcmc14u	cmltusqzl0017c6cfwl6xvqpa	BeautSoul Rose Water Face Toner 100ml	3	75	225	S680	2027-05-31 00:00:00	2025-06-01 00:00:00
cmltusqzv001fc6cf2fmltdin	cmltusqzl0017c6cfwl6xvqpa	BeautSoul SunScreen Gel	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmltusqzy001ic6cfasmpugpd	cmltusqzl0017c6cfwl6xvqpa	BeautSoul SunScreen Sun Shield 50g	3	162	486	SC/6/2	2027-05-31 00:00:00	2025-06-01 00:00:00
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Order" (id, "orderNo", "distributorId", "retailerId", status, "totalAmount", "paidAmount", "createdAt", "updatedAt", "appVersion", "clientRequestHash", "deviceId", "idempotencyKey", "requestReceivedAt") FROM stdin;
65de6973-2c76-4986-90cf-3979aa8830f9	FO-20260218-4032D6	cmlrx8gck0006sv7zf3wl8k22	cmlrzd9jb001hsv7zy53cma4z	DISPATCHED	3099	0	2026-02-18 12:56:37.952	2026-02-18 12:57:45.092	\N	\N	\N	\N	\N
4770ee96-ee11-4bc8-85c2-6ee8222b542f	FO-20260218-F8F29B	cmlrx8gck0006sv7zf3wl8k22	cmlryzj3k0012sv7zs98xk48h	DISPATCHED	2697	0	2026-02-18 12:55:40.203	2026-02-18 12:58:12.863	\N	\N	\N	\N	\N
6450a92d-e5d1-4e8b-8fcb-f96b3b69bf6c	FO-20260218-17D4DA	cmlrx8gck0006sv7zf3wl8k22	cmlrz8o9p0017sv7z3lxhgc78	DISPATCHED	1497	0	2026-02-18 12:55:01.803	2026-02-18 12:58:33.107	\N	\N	\N	\N	\N
6a4e7265-ce2d-40d8-85c4-2e7e70b8c9cc	FO-20260218-B5BCC6	cmlrx8gck0006sv7zf3wl8k22	cmlrysyk0000ssv7zvaovs2rd	DISPATCHED	399	0	2026-02-18 12:51:30.341	2026-02-18 12:58:47.488	\N	\N	\N	\N	\N
22105440-f824-4ab9-a3f5-cb21890f993d	FO-20260218-BAE953	cmlrx8gck0006sv7zf3wl8k22	cmlrzam06001csv7zr5vt153r	DISPATCHED	1497	0	2026-02-18 12:48:17.247	2026-02-18 12:59:16.829	\N	\N	\N	\N	\N
84e411b4-741a-447c-bb84-f7e553ee88d2	FO-20260219-EB2F62	cmlrx8gck0006sv7zf3wl8k22	cmltfo7vn0007bt8fwt50epqn	DISPATCHED	2697	0	2026-02-19 17:53:58.091	2026-02-19 18:08:26.017	\N	\N	\N	\N	\N
f591a909-fa88-4b70-a621-42b9d1bb4a7d	FO-20260219-8A8E3D	cmlrx8gck0006sv7zf3wl8k22	cmlryj1vy000isv7z9eo8pk51	DISPATCHED	1497	0	2026-02-19 19:27:00.673	2026-02-19 19:28:08.113	\N	\N	\N	\N	\N
\.


--
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderItem" (id, "orderId", "productName", qty, rate, amount) FROM stdin;
cmls12ov2002bsv7zhcwr3edd	22105440-f824-4ab9-a3f5-cb21890f993d	BeautSoul Bamboo Tooth Brush	5	60	300
cmls12ov2002csv7zc29nw2kv	22105440-f824-4ab9-a3f5-cb21890f993d	BeautSoul Rose Water Face Toner 100ml	3	75	225
cmls12ov2002dsv7zcp1lt2ux	22105440-f824-4ab9-a3f5-cb21890f993d	BeautSoul SunScreen Gel	3	162	486
cmls12ov3002esv7zitiapqy9	22105440-f824-4ab9-a3f5-cb21890f993d	BeautSoul SunScreen Sun Shield 50g	3	162	486
cmls16tut002nsv7z0ka2d33w	6a4e7265-ce2d-40d8-85c4-2e7e70b8c9cc	BeautSoul Rose Water Face Toner 100ml	1	75	75
cmls16tut002osv7z0100drab	6a4e7265-ce2d-40d8-85c4-2e7e70b8c9cc	BeautSoul SunScreen Gel	1	162	162
cmls16tut002psv7zs1y1rvmw	6a4e7265-ce2d-40d8-85c4-2e7e70b8c9cc	BeautSoul SunScreen Sun Shield 50g	1	162	162
cmls1bd0r002qsv7z31hud5e5	6450a92d-e5d1-4e8b-8fcb-f96b3b69bf6c	BeautSoul Bamboo Tooth Brush	5	60	300
cmls1bd0r002rsv7zbcs1ch7h	6450a92d-e5d1-4e8b-8fcb-f96b3b69bf6c	BeautSoul Rose Water Face Toner 100ml	3	75	225
cmls1bd0r002ssv7zgwmzrtxh	6450a92d-e5d1-4e8b-8fcb-f96b3b69bf6c	BeautSoul SunScreen Gel	3	162	486
cmls1bd0r002tsv7zxav9zevt	6450a92d-e5d1-4e8b-8fcb-f96b3b69bf6c	BeautSoul SunScreen Sun Shield 50g	3	162	486
cmls1c6nf002usv7zfs5v9ws9	4770ee96-ee11-4bc8-85c2-6ee8222b542f	BeautSoul Bamboo Tooth Brush	25	60	1500
cmls1c6nf002vsv7zz3gfmlug	4770ee96-ee11-4bc8-85c2-6ee8222b542f	BeautSoul Rose Water Face Toner 100ml	3	75	225
cmls1c6nf002wsv7z13h7g5vt	4770ee96-ee11-4bc8-85c2-6ee8222b542f	BeautSoul SunScreen Gel	3	162	486
cmls1c6nf002xsv7zgbqaaajq	4770ee96-ee11-4bc8-85c2-6ee8222b542f	BeautSoul SunScreen Sun Shield 50g	3	162	486
cmls1df7k002ysv7z5owkdk1l	65de6973-2c76-4986-90cf-3979aa8830f9	BeautSoul Bamboo Tooth Brush	3	60	180
cmls1df7k002zsv7z9ferrr8l	65de6973-2c76-4986-90cf-3979aa8830f9	BeautSoul Rose Water Face Toner 100ml	13	75	975
cmls1df7k0030sv7zy4mr78qd	65de6973-2c76-4986-90cf-3979aa8830f9	BeautSoul SunScreen Sun Shield 50g	6	162	972
cmls1df7k0031sv7zde6we8vg	65de6973-2c76-4986-90cf-3979aa8830f9	BeautSoul SunScreen Gel	6	162	972
cmltrfnez0001c6cfaryaqhhs	84e411b4-741a-447c-bb84-f7e553ee88d2	BeautSoul Bamboo Tooth Brush	25	60	1500
cmltrfnez0002c6cfmsso1vad	84e411b4-741a-447c-bb84-f7e553ee88d2	BeautSoul Rose Water Face Toner 100ml	3	75	225
cmltrfnez0003c6cf6wzceul2	84e411b4-741a-447c-bb84-f7e553ee88d2	BeautSoul SunScreen Gel	3	162	486
cmltrfnez0004c6cf5hur6uud	84e411b4-741a-447c-bb84-f7e553ee88d2	BeautSoul SunScreen Sun Shield 50g	3	162	486
cmlturayp0011c6cfrczbuupo	f591a909-fa88-4b70-a621-42b9d1bb4a7d	BeautSoul Bamboo Tooth Brush	5	60	300
cmlturayp0012c6cfg9098aue	f591a909-fa88-4b70-a621-42b9d1bb4a7d	BeautSoul Rose Water Face Toner 100ml	3	75	225
cmlturayp0013c6cf9hdjb8ad	f591a909-fa88-4b70-a621-42b9d1bb4a7d	BeautSoul SunScreen Gel	3	162	486
cmlturayp0014c6cfagxr3ex9	f591a909-fa88-4b70-a621-42b9d1bb4a7d	BeautSoul SunScreen Sun Shield 50g	3	162	486
\.


--
-- Data for Name: OrderRequestLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderRequestLog" (id, "createdAt", endpoint, "requestId", "idempotencyKey", "clientRequestHash", "userId", "retailerId", "distributorId", "deviceId", result, "orderId", error) FROM stdin;
\.


--
-- Data for Name: ProductCatalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProductCatalog" (id, name, barcode, hsn, mrp, "salePrice", "gstRate", "isActive", "createdAt", "updatedAt") FROM stdin;
cmlrx14e00000sv7z0lefbhjn	BeautSoul SunScreen Gel	\N	\N	162	124.5	\N	t	2026-02-18 10:55:05.591	2026-02-18 10:55:05.591
cmlrx28sj0001sv7z17rph0we	BeautSoul SunScreen Sun Shield 50g	\N	\N	162	124.5	\N	t	2026-02-18 10:55:57.955	2026-02-18 10:55:57.955
cmlrx3cxz0002sv7z5dpu7wkf	BeautSoul Rose Water Face Toner 100ml	\N	\N	75	75	\N	t	2026-02-18 10:56:49.991	2026-02-18 10:56:49.991
cmlrx40to0003sv7z5fxspz8f	BeautSoul Bamboo Tooth Brush	\N	\N	60	50	\N	t	2026-02-18 10:57:20.94	2026-02-18 10:57:20.94
\.


--
-- Data for Name: Retailer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Retailer" (id, "userId", name, phone, gst, address, city, state, pincode, status, "distributorId", "createdByRole", "createdById", "activatedByDistributorId", "activatedAt", "createdAt", "updatedAt", district) FROM stdin;
cmlrzam06001csv7zr5vt153r	cmlrzam05001asv7zpz62ytfg	Health Store ( Rupesh Pawar )	9545450621	\N	\N	Bhosari	Maharastra	411026	ACTIVE	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-18 11:58:27.558	2026-02-18 12:52:37.872	Pune
cmlrz8o9p0017sv7z3lxhgc78	cmlrz8o9n0015sv7z2uuxyk8u	Shree Sai Medicos ( Depali )	9209015117	\N	\N	Bhosari	Maharashtra	411026	ACTIVE	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-18 11:56:57.181	2026-02-18 12:53:02.144	Pune
cmlrzd9jb001hsv7zy53cma4z	cmlrzd9ja001fsv7zmeb7o392	VELVET VISTA COSMETIC	9970365147	\N	Kate Bangar Park, Velvet Vista Building, Krishna Chowk, New Sangvi, Pimple Gurav, Pune, Pimpri-Chinchwad, Maharashtra 411061	New Sangvi	Maharashtra	411061	ACTIVE	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-18 12:00:31.367	2026-02-18 12:53:09.983	Pune
cmlrywcdc000xsv7zpcglc3ft	cmlrywcda000vsv7z5byw6f4g	SH MAKEOVER & NAILS ( Shivangi )	8888882026	\N	Shop No. 2,Jay Jayanti Residency, Kalewadi - Rahatani Road, opposite Corporater Nana Kate office, Mahadev Mandir Road, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-18 11:47:21.889	2026-02-18 12:54:11.014	Pune
cmlryzj3k0012sv7zs98xk48h	cmlryzj3i0010sv7zziht7o5q	The Beauty Collection (Jitu)	8554814849	\N	Shop No: 4, building No: A-3, Tushar Residency, NEar kokane chowk, Rahatani Rd, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-18 11:49:50.577	2026-02-18 12:54:19.845	Pune
cmlryo6w7000nsv7z8neelbxd	cmlryo6w5000lsv7zkr6w4kr4	Royal chemist (Mohan Chaudhary)	9175075842	\N	Shop n. 03 Aaditya Avenuner nawale res, Pimple Saudagar, Pune, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-18 11:41:01.544	2026-02-18 12:54:28.928	Pune
cmlryj1vy000isv7z9eo8pk51	cmlryj1vx000gsv7zk5cmamtn	Shree Sai Generic Medical ( Shekar Bibe )	7875581515	\N	Sai Atharva, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-18 11:37:01.775	2026-02-19 04:22:43.676	\N
cmlrysyk0000ssv7zvaovs2rd	cmlrysyjz000qsv7zwemsiu9i	Shree Krishna Medical( Narangi Chaudhary)	8806228899	\N	Bhalerao Corner, Jagtap Dairy, Rahatni Road, Arvind Colony, Rahatani, Pune, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-18 11:44:44.016	2026-02-19 04:24:30.813	\N
cmltfo7vn0007bt8fwt50epqn	cmltfo7vk0005bt8f4uqn7mju	New Shree Kohinoor Medico ( Harish Chaudhary ))	9860587503	27AHDPC5153E1ZS	Shop 1/2 Nera Krishna Chowk, Dnyanesh Park, Mauli Krupa, Pimple Gurav, Pune Mobile 9860587503, 8282829916	New Sangvi	Maharashtra	411061	PENDING	cmlrx8gck0006sv7zf3wl8k22	SALES_MANAGER	cmlrs15x900019dphgbu86n9b	\N	\N	2026-02-19 12:24:42.467	2026-02-19 13:45:15.99	Pune
\.


--
-- Data for Name: RetailerAssignmentActive; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RetailerAssignmentActive" (id, "retailerId", "foUserId", "distributorId", "assignedByUserId", "assignedAt", note) FROM stdin;
cmlsedyc2000oaigc0qy9j31r	cmlrzam06001csv7zr5vt153r	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745	\N
cmlsedyca000saigcetv8z5hz	cmlrz8o9p0017sv7z3lxhgc78	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745	\N
cmlsedycc000waigcfejm7juv	cmlrzd9jb001hsv7zy53cma4z	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745	\N
cmlsedyce0010aigcicl882s3	cmlrysyk0000ssv7zvaovs2rd	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745	\N
cmlsedycg0014aigca9yqeigl	cmlrywcdc000xsv7zpcglc3ft	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745	\N
cmlsedyci0018aigcmqhv7f8t	cmlryzj3k0012sv7zs98xk48h	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745	\N
cmlsedycj001caigcdj2faj5m	cmlryo6w7000nsv7z8neelbxd	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745	\N
cmlsedycl001gaigc7x64tmdx	cmlryj1vy000isv7z9eo8pk51	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745	\N
\.


--
-- Data for Name: RetailerAssignmentHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RetailerAssignmentHistory" (id, "retailerId", "fromFoUserId", "toFoUserId", "distributorId", "eventType", reason, "actorUserId", "createdAt") FROM stdin;
cmlsedyc6000qaigceeih2ryy	cmlrzam06001csv7zr5vt153r	\N	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	ASSIGN	\N	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745
cmlsedycb000uaigchhubbq6h	cmlrz8o9p0017sv7z3lxhgc78	\N	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	ASSIGN	\N	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745
cmlsedycd000yaigcgnou3akn	cmlrzd9jb001hsv7zy53cma4z	\N	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	ASSIGN	\N	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745
cmlsedycf0012aigc2f1bc35p	cmlrysyk0000ssv7zvaovs2rd	\N	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	ASSIGN	\N	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745
cmlsedych0016aigcntjypqul	cmlrywcdc000xsv7zpcglc3ft	\N	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	ASSIGN	\N	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745
cmlsedyci001aaigceajzl0dq	cmlryzj3k0012sv7zs98xk48h	\N	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	ASSIGN	\N	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745
cmlsedyck001eaigce69bi8bi	cmlryo6w7000nsv7z8neelbxd	\N	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	ASSIGN	\N	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745
cmlsedycl001iaigcd2g75rkg	cmlryj1vy000isv7z9eo8pk51	\N	cmlrzef8w001jsv7zjx50udui	cmlrx8gck0006sv7zf3wl8k22	ASSIGN	\N	cmlrs15x900019dphgbu86n9b	2026-02-18 19:00:57.745
\.


--
-- Data for Name: RetailerLedger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RetailerLedger" (id, "retailerId", "distributorId", date, type, amount, reference, narration, "createdAt") FROM stdin;
cmls1ev0l003isv7zat70y4si	cmlrzd9jb001hsv7zy53cma4z	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 12:57:45.093	DEBIT	3099	INV1771419465069	Invoice generated for Order FO-20260218-4032D6	2026-02-18 12:57:45.093
cmls1fgg0003zsv7z2fzm4qid	cmlryzj3k0012sv7zs98xk48h	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 12:58:12.865	DEBIT	2697	INV1771419492845	Invoice generated for Order FO-20260218-F8F29B	2026-02-18 12:58:12.865
cmls1fw2c004gsv7zbzzelgec	cmlrz8o9p0017sv7z3lxhgc78	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 12:58:33.108	DEBIT	1497	INV1771419513093	Invoice generated for Order FO-20260218-17D4DA	2026-02-18 12:58:33.108
cmls1g75t004usv7z22q8v0rx	cmlrysyk0000ssv7zvaovs2rd	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 12:58:47.489	DEBIT	399	INV1771419527475	Invoice generated for Order FO-20260218-B5BCC6	2026-02-18 12:58:47.489
cmls1gido005bsv7z3fqmzer0	cmlryj1vy000isv7z9eo8pk51	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 12:59:02.028	DEBIT	1497	INV1771419542012	Invoice generated for Order FO-20260218-9D43AE	2026-02-18 12:59:02.028
cmls1gtsu005ssv7z6njcyrty	cmlrzam06001csv7zr5vt153r	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 12:59:16.83	DEBIT	1497	INV1771419556815	Invoice generated for Order FO-20260218-BAE953	2026-02-18 12:59:16.83
cmlsdr7um0003aigcbhhaq7q1	cmlryj1vy000isv7z9eo8pk51	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 18:43:16.99	CREDIT	1497	\N	FO Collection • CASH	2026-02-18 18:43:16.99
cmlsdrv4l0007aigcytyy2opt	cmlrzam06001csv7zr5vt153r	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 18:43:47.157	CREDIT	1497	\N	FO Collection • CASH	2026-02-18 18:43:47.157
cmlsdsc60000baigcnelecnko	cmlrysyk0000ssv7zvaovs2rd	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 18:44:09.24	CREDIT	399	\N	FO Collection • CASH	2026-02-18 18:44:09.24
cmlsdtylc000faigcy3zyyfk0	cmlrzd9jb001hsv7zy53cma4z	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 18:45:24.96	CREDIT	3099	ddghhddfgd	FO Collection • UPI	2026-02-18 18:45:24.96
cmlsduepo000jaigcd44kqqk6	cmlrz8o9p0017sv7z3lxhgc78	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 18:45:45.853	CREDIT	1497	\N	FO Collection • CASH	2026-02-18 18:45:45.853
cmltry942000lc6cfj0dgz3dm	cmltfo7vn0007bt8fwt50epqn	cmlrx8gck0006sv7zf3wl8k22	2026-02-19 18:08:26.018	DEBIT	2697	INV1771524506000	Invoice generated for Order FO-20260219-EB2F62	2026-02-19 18:08:26.018
cmltusr02001lc6cfuy8qpg6c	cmlryj1vy000isv7z9eo8pk51	cmlrx8gck0006sv7zf3wl8k22	2026-02-19 19:28:08.115	DEBIT	1497	INV1771529288097	Invoice generated for Order FO-20260219-8A8E3D	2026-02-19 19:28:08.115
cmltutrjy001nc6cf6bxqwjk3	cmlryj1vy000isv7z9eo8pk51	cmlrx8gck0006sv7zf3wl8k22	2026-02-19 19:28:55.486	CREDIT	1497	\N	FO Collection • CASH	2026-02-19 19:28:55.486
\.


--
-- Data for Name: RetailerStockAudit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RetailerStockAudit" (id, "distributorId", "fieldOfficerId", "retailerId", "auditDate", "createdAt") FROM stdin;
cmltspqwk000oc6cfebytqa8q	cmlrx8gck0006sv7zf3wl8k22	cmlrzef8w001jsv7zjx50udui	cmlryj1vy000isv7z9eo8pk51	2026-02-19 18:29:48.788	2026-02-19 18:29:48.789
cmltwe8ls000bfriolhbcmcg0	cmlrx8gck0006sv7zf3wl8k22	cmlrzef8w001jsv7zjx50udui	cmlrzam06001csv7zr5vt153r	2026-02-19 20:12:50.32	2026-02-19 20:12:50.321
\.


--
-- Data for Name: RetailerStockAuditItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RetailerStockAuditItem" (id, "auditId", "productName", "batchNo", "expiryDate", "systemQty", "physicalQty", variance) FROM stdin;
cmltspqwk000pc6cf1i50d0sz	cmltspqwk000oc6cfebytqa8q	BeautSoul Bamboo Tooth Brush	\N	\N	0	4	4
cmltspqwk000qc6cfuksdse6r	cmltspqwk000oc6cfebytqa8q	BeautSoul Rose Water Face Toner 100ml	\N	\N	0	3	3
cmltspqwk000rc6cft4rqw8at	cmltspqwk000oc6cfebytqa8q	BeautSoul SunScreen Gel	\N	\N	0	3	3
cmltspqwk000sc6cfrwclnfru	cmltspqwk000oc6cfebytqa8q	BeautSoul SunScreen Sun Shield 50g	\N	\N	0	3	3
cmltwe8ls000cfrioddh10yxr	cmltwe8ls000bfriolhbcmcg0	BeautSoul Bamboo Tooth Brush	BT001	2029-12-31 00:00:00	0	5	5
cmltwe8ls000dfrio7sg25ons	cmltwe8ls000bfriolhbcmcg0	BeautSoul Rose Water Face Toner 100ml	S680	2027-05-31 00:00:00	0	3	3
cmltwe8ls000efrio4jvae435	cmltwe8ls000bfriolhbcmcg0	BeautSoul SunScreen Gel	S712	2027-06-30 00:00:00	0	3	3
cmltwe8ls000ffriocphyepzp	cmltwe8ls000bfriolhbcmcg0	BeautSoul SunScreen Sun Shield 50g	SC/6/2	2027-05-31 00:00:00	0	3	3
\.


--
-- Data for Name: RetailerStockBatch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RetailerStockBatch" (id, "retailerId", "productName", "batchNo", "expiryDate", qty, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RetailerStockSnapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RetailerStockSnapshot" (id, "distributorId", "retailerId", "productName", "batchNo", "expiryDate", qty, "updatedAt") FROM stdin;
cmltwe8lx000hfrioqill1il3	cmlrx8gck0006sv7zf3wl8k22	cmlrzam06001csv7zr5vt153r	BeautSoul Bamboo Tooth Brush	BT001	2029-12-31 00:00:00	5	2026-02-19 20:12:50.325
cmltwe8lz000jfriorz18qrbt	cmlrx8gck0006sv7zf3wl8k22	cmlrzam06001csv7zr5vt153r	BeautSoul Rose Water Face Toner 100ml	S680	2027-05-31 00:00:00	3	2026-02-19 20:12:50.328
cmltwe8m0000lfrioy9os35o7	cmlrx8gck0006sv7zf3wl8k22	cmlrzam06001csv7zr5vt153r	BeautSoul SunScreen Gel	S712	2027-06-30 00:00:00	3	2026-02-19 20:12:50.329
cmltwe8m2000nfrio5fk1e6eo	cmlrx8gck0006sv7zf3wl8k22	cmlrzam06001csv7zr5vt153r	BeautSoul SunScreen Sun Shield 50g	SC/6/2	2027-05-31 00:00:00	3	2026-02-19 20:12:50.33
cmltspqwz0010c6cf4s3gofgo	cmlrx8gck0006sv7zf3wl8k22	cmlryj1vy000isv7z9eo8pk51	BeautSoul SunScreen Sun Shield 50g	SC/6/2	2027-05-31 00:00:00	3	2026-02-19 20:21:53.21
cmltspqww000wc6cf9dwzdcjv	cmlrx8gck0006sv7zf3wl8k22	cmlryj1vy000isv7z9eo8pk51	BeautSoul Rose Water Face Toner 100ml	S680	2027-05-31 00:00:00	3	2026-02-19 20:24:50.576
cmltspqwy000yc6cfog4y0iqk	cmlrx8gck0006sv7zf3wl8k22	cmlryj1vy000isv7z9eo8pk51	BeautSoul SunScreen Gel	S712	2027-06-30 00:00:00	3	2026-02-19 20:24:50.576
cmltspqwu000uc6cfupq0fszg	cmlrx8gck0006sv7zf3wl8k22	cmlryj1vy000isv7z9eo8pk51	BeautSoul Bamboo Tooth Brush	BT001	2029-12-31 00:00:00	4	2026-02-19 20:25:54.877
\.


--
-- Data for Name: RewardCatalog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RewardCatalog" (id, title, subtitle, "pointsCost", active, "imageUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RewardRedeemRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RewardRedeemRequest" (id, "foUserId", "rewardId", status, note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalesTarget; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SalesTarget" (id, month, "targetAmount", "assignedById", "fieldOfficerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockAudit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockAudit" (id, "warehouseId", "monthKey", "auditDate", "snapshotAt", status, "totalSystemQty", "totalPhysicalQty", "totalVarianceQty", "investigationQtyThreshold", "investigationPctThreshold", "createdByUserId", "submittedByUserId", "approvedByUserId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockAuditLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockAuditLine" (id, "auditId", "productName", "batchNo", "mfgDate", "expDate", "systemQty", "physicalQty", "diffQty", "mismatchType", reason, "rootCause", remarks, "needsInvestigation", "isRepeatIssue", "evidenceUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockAuditTask; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockAuditTask" (id, "auditId", title, "assignedToUserId", "dueDate", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockLot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockLot" (id, "ownerType", "ownerId", "batchNo", "expDate", "qtyOnHandPcs", "createdAt", "updatedAt", "productName", "mfgDate") FROM stdin;
cmlrzwagq001qsv7zafgd8d0z	COMPANY	\N	BT001`	2029-12-31 00:00:00	780	2026-02-18 12:15:19.028	2026-02-18 12:33:25.318	BeautSoul Bamboo Tooth Brush	2026-01-01 00:00:00
cmlrzyf1k001rsv7zytzv09ee	COMPANY	\N	S680	2027-05-31 00:00:00	130	2026-02-18 12:16:58.28	2026-02-18 12:33:25.319	BeautSoul Rose Water Face Toner 100ml	2025-06-01 00:00:00
cmls02q07001tsv7zobhwy9bx	COMPANY	\N	SC/6/2	2027-05-31 00:00:00	0	2026-02-18 12:20:19.097	2026-02-18 12:33:25.319	BeautSoul SunScreen Sun Shield 50g	2025-06-01 00:00:00
cmls00rdy001ssv7zq7w8mx6h	COMPANY	\N	S712	2027-06-30 00:00:00	20	2026-02-18 12:18:47.59	2026-02-18 12:33:25.319	BeautSoul SunScreen Gel	2025-07-01 00:00:00
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, code, name, phone, "passwordHash", role, status, address, city, state, pincode, "distributorId", "createdAt", "updatedAt", district) FROM stdin;
cmlrs15v100009dphyn4vg1ox	AD-8049	Admin User	9000000001	$2b$10$PP9Wod6iA7p0I1EmPEoiHe/lrEmjnAWtpi5f1Q6H3BZ9lP41ZiVlu	ADMIN	ACTIVE	\N	\N	\N	\N	\N	2026-02-18 08:35:09.421	2026-02-18 08:35:09.421	\N
cmlrs15x900019dphgbu86n9b	SM-1759	Sales Manager	9000000002	$2b$10$I6wKfZgsEDvpouFGfCwRCO32f1iOQ95AoYal9Rg44CZUk4oDmmYJO	SALES_MANAGER	ACTIVE	\N	\N	\N	\N	\N	2026-02-18 08:35:09.502	2026-02-18 08:35:09.502	\N
cmlrs15z700029dphg79wh0ui	WH-1130	Warehouse Manager	9000000003	$2b$10$dhhexqcyu4unPYTOglP1FO4bOma1fawYI5eIJuHS63V44pQ3ab.Ny	WAREHOUSE_MANAGER	ACTIVE	\N	\N	\N	\N	\N	2026-02-18 08:35:09.572	2026-02-18 08:35:09.572	\N
cmlrx8gcr0008sv7zs9ckqels	BSD13324251	Vinay	8721967609	$2b$10$gpiMN.Ce6bDZylbC.KMfJOgsc8PJHWz.IfEAHs/5zvUf1cu4Jhnyq	DISTRIBUTOR	ACTIVE	\N	Pimpri-chinchwad	Maharashtra	411027	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 11:00:47.691	2026-02-18 11:00:47.691	Pune
cmlrx9dzm000dsv7z4c9xs1o2	BSD64996512	Savita	9041760000	$2b$10$Qhaa/KqhryPwwRlHS.tyquDfxGaymy4n8fonE7bO3H4WJDzBaspgm	DISTRIBUTOR	ACTIVE	\N	Abohar	Punjab	152116	cmlrx9dzl000bsv7z6bjuly9l	2026-02-18 11:01:31.282	2026-02-18 11:01:31.282	Firozpur
cmlrzef8w001jsv7zjx50udui	BSF75903725	Prashant Rinwa	9877025858	$2b$10$xYX/6zC2gFMfzUy0GmCbteb8cnQFN3HGJ2gYGinBJDI/.OQUs9EtK	FIELD_OFFICER	ACTIVE	\N	Abohar	Punjab	152116	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 12:01:25.424	2026-02-18 12:01:25.424	Firozpur
cmlrzam05001asv7zpz62ytfg	BSR84846252	Health Store ( Rupesh Pawar )	9545450621	$2b$10$j4jztP8WFHMOGBi3sTSJx.2NGT8AW/oGcnZUYn3EgOPgQLCmMRvAG	RETAILER	ACTIVE	\N	Bhosari	Maharastra	411026	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 11:58:27.557	2026-02-18 12:52:37.874	Pune
cmlrz8o9n0015sv7z2uuxyk8u	BSR59296664	Shree Sai Medicos ( Depali )	9209015117	$2b$10$G2UOc5chYt6mD2Mqboklwep9dguKyQa2/SKwnQJi5YsusLSArvwOq	RETAILER	ACTIVE	\N	Bhosari	Maharashtra	411026	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 11:56:57.18	2026-02-18 12:53:02.146	Pune
cmlrzd9ja001fsv7zmeb7o392	BSR89806624	VELVET VISTA COSMETIC	9970365147	$2b$10$w0V/0kPCXTOwr40UPCIprOI.KWwAJTN3tFMRGgZZ5b53aMiBd7S0a	RETAILER	ACTIVE	Kate Bangar Park, Velvet Vista Building, Krishna Chowk, New Sangvi, Pimple Gurav, Pune, Pimpri-Chinchwad, Maharashtra 411061	New Sangvi	Maharashtra	411061	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 12:00:31.366	2026-02-18 12:53:09.986	Pune
cmlrysyjz000qsv7zwemsiu9i	BSR43796099	Shree Krishna Medical( Narangi Chaudhary)	8806228899	$2b$10$9El2URRECHOM/hR.FvBW6.5bnX0nZe7v9fs2db7IvvLKV78YFUHG.	RETAILER	ACTIVE	Bhalerao Corner, Jagtap Dairy, Rahatni Road, Arvind Colony, Rahatani, Pune, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 11:44:44.015	2026-02-19 04:24:30.811	\N
cmlrywcda000vsv7z5byw6f4g	BSR62442079	SH MAKEOVER & NAILS ( Shivangi )	8888882026	$2b$10$acr/hklDwdJ2p.v8vTqjxulTgEVwMYdeCLaI8xIZM02K5yGvwwbAe	RETAILER	ACTIVE	Shop No. 2,Jay Jayanti Residency, Kalewadi - Rahatani Road, opposite Corporater Nana Kate office, Mahadev Mandir Road, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 11:47:21.886	2026-02-18 12:54:11.016	Pune
cmlryzj3i0010sv7zziht7o5q	BSR78179933	The Beauty Collection (Jitu)	8554814849	$2b$10$/506.w2ATJCbClI3zcDlVevqIskURNVxauWmJSjkKjw9//.Szks5O	RETAILER	ACTIVE	Shop No: 4, building No: A-3, Tushar Residency, NEar kokane chowk, Rahatani Rd, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 11:49:50.575	2026-02-18 12:54:19.847	Pune
cmlryo6w5000lsv7zkr6w4kr4	BSR65957738	Royal chemist (Mohan Chaudhary)	9175075842	$2b$10$.8FVenaRZfoDZCjR/CKMXubn.6bOxPK1NSjAKVRPVXD./qaU7TXb.	RETAILER	ACTIVE	Shop n. 03 Aaditya Avenuner nawale res, Pimple Saudagar, Pune, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 11:41:01.541	2026-02-18 12:54:28.93	Pune
cmlryj1vx000gsv7zk5cmamtn	BSR81236686	Shree Sai Generic Medical ( Shekar Bibe )	7875581515	$2b$10$3MLb1Dlwi1lvEcqKP4sBku0jYjrDMMKkLoODfvI0VYlDRe9iqV08y	RETAILER	ACTIVE	Sai Atharva, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlrx8gck0006sv7zf3wl8k22	2026-02-18 11:37:01.773	2026-02-19 04:22:43.673	\N
cmltfo7vk0005bt8f4uqn7mju	BSR06534609	New Shree Kohinoor Medico ( Harish Chaudhary ))	9860587503	$2b$10$X1TdbLh3nwgfRwreehw7FufduEXZXklVVtWkI0pyydvTL2R1v.Gr6	RETAILER	ACTIVE	Shop 1/2 Nera Krishna Chowk, Dnyanesh Park, Mauli Krupa, Pimple Gurav, Pune Mobile 9860587503, 8282829916	New Sangvi	Maharashtra	411061	cmlrx8gck0006sv7zf3wl8k22	2026-02-19 12:24:42.464	2026-02-19 13:45:15.982	Pune
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
f56cfe50-a2a8-4dad-afea-a6f2380ec8fd	aa15e7f5487c4ec526d21d0ccb7d86ee2833a7f52ef03d5f1368c4934a3bc244	2026-02-18 10:37:38.508334+05:30	20260206123745_add_distributor_product_rate	\N	\N	2026-02-18 10:37:38.505926+05:30	1
526e36e1-1528-4ab3-95d1-5e4c184c968e	f2935701f245ac0891bb846511ce6dd020c6f51b3d0bbb81cecc916b9d51564d	2026-02-18 10:37:38.460216+05:30	20260126154920_add_user_status	\N	\N	2026-02-18 10:37:38.445404+05:30	1
66cbac7b-f132-4502-a6df-bc11745b9663	f3443b0c9b674f3e20bf705a4707784bd3ffa0ba1b081ac1ffce9cd61ddbc519	2026-02-18 10:37:38.466104+05:30	20260126165414_add_inventory_and_invoices	\N	\N	2026-02-18 10:37:38.460612+05:30	1
581300cc-1d76-4e46-b82c-3de44bfeb8d9	7c53909a0723b2f0c97fe5c3c833eaac6d4cd0e768a9921ef939d75166882809	2026-02-18 10:37:38.559413+05:30	20260218044718_make_order_idempotency_not_null	\N	\N	2026-02-18 10:37:38.55841+05:30	1
6d73fcb9-d128-4eb6-a54f-e4b5b263fb9a	f549151817f0e7c2ac2b24f04d50bd861d2a4a619d56531685a2c59a7b14c7ea	2026-02-18 10:37:38.478958+05:30	20260126190537_stock_inbound	\N	\N	2026-02-18 10:37:38.4667+05:30	1
c93f0de5-b879-4995-afc1-39ad618eb032	2d0f9954d0e7162848ea9129912b74f8306a82cbc096328aea89ee0757c07bda	2026-02-18 10:37:38.510635+05:30	20260211032953_add_distributor_district_optional	\N	\N	2026-02-18 10:37:38.508607+05:30	1
a5e23a31-2459-4c34-a988-376be66ce0dd	5c06391f2e799c0e8f073760d5a8e473855bd84a0ea05cd5a8d5ba4855634d5c	2026-02-18 10:37:38.485666+05:30	20260127150123_add_retailer_ledger	\N	\N	2026-02-18 10:37:38.479366+05:30	1
f083db61-1a13-4f33-ae75-9476658162bd	4fc3cf5eaaa163467377ab557e4f9f7c461f2836e83e3376ccd60118c2ee3370	2026-02-18 10:37:38.489054+05:30	20260129163225_fix_schema	\N	\N	2026-02-18 10:37:38.486021+05:30	1
4893a468-831f-4a9f-a034-714e040375e5	5be2e96e60d5890c8d0ee2ceabb6551eba26b85b944df1feae25bbff4b337709	2026-02-18 10:37:38.544213+05:30	20260216144639_add_fo_retailer_map	\N	\N	2026-02-18 10:37:38.54138+05:30	1
9e2813ce-61f2-48cf-859e-434a16bcd4e9	317485ac3f3118f59c26d8da3821d28e07fe695b546976466958f91d4c069f15	2026-02-18 10:37:38.491521+05:30	20260131024209_invoice_type_optional_retailer_order	\N	\N	2026-02-18 10:37:38.489336+05:30	1
7f09fed0-370b-48e9-873e-efb357f30532	d59379eb466b95cf8d51a74ff2d0ca0d8999947b09bbfb8d7d9c0a1530da716d	2026-02-18 10:37:38.511852+05:30	20260211180615_add_shippingmode_self	\N	\N	2026-02-18 10:37:38.510916+05:30	1
d7f0213a-7966-458a-bfb6-cedf7b654eba	e06d4bed76d150ff3e7922984843147e984e414e2942a5001bd03c8e2e22af08	2026-02-18 10:37:38.493553+05:30	20260131044140_warehouse_payment_dispatch_fields	\N	\N	2026-02-18 10:37:38.491875+05:30	1
08bde018-81a1-4523-b692-623e42d97bb8	51f835a5dc8e53b1aa38cf493a2560fa229ec295a07aa9c596d05931b06a90cd	2026-02-18 10:37:38.49461+05:30	20260201192735_add_inbound_payment_verified_status	\N	\N	2026-02-18 10:37:38.493855+05:30	1
0721a6e2-6bd9-4a82-b488-31108a5c848a	ce0e9e448e208b2d49412d4033e63b3275a0cbb356e740386b6943cdcaa11202	2026-02-18 10:37:38.496145+05:30	20260201204855_fix_inbound_payment_columns	\N	\N	2026-02-18 10:37:38.49485+05:30	1
6446339c-fe52-4557-9032-e490d6c4e880	fcf7af6735b79a3bae4018d1a7902e2a3d4c868f2bed5af6168daf0b7569580a	2026-02-18 10:37:38.517643+05:30	20260212084254_inventory_advanced	\N	\N	2026-02-18 10:37:38.512231+05:30	1
cbd3bef0-549f-4a7b-882c-5bc557dc4a53	490cfdf96cc48b67ae5e14fcda0401b9eab1b4603ddd8de1f4f351dcd5a875c8	2026-02-18 10:37:38.498702+05:30	20260201210405_inbound_order_payment_fields	\N	\N	2026-02-18 10:37:38.496422+05:30	1
3325c0ec-1f23-4698-a5e9-42893c4b2564	391b3547d2a120d95d5cc4fde313a8620ae368ccc67c34c05cc56f7f2cc9789b	2026-02-18 10:37:38.50415+05:30	20260203051351_inbound_dispatch_models	\N	\N	2026-02-18 10:37:38.499102+05:30	1
a1725007-139c-4ff3-8827-e1241577d2ff	b6e10d2b2f79ec3cc52a25dd2e202a365839d5fe34e88eb268ab884ecdd2184b	2026-02-18 10:37:38.505624+05:30	20260203163426_add_mfg_date_to_batches	\N	\N	2026-02-18 10:37:38.504476+05:30	1
029b4d32-e0e5-4b14-9e74-d0c4d78e97b0	7dd41693781478d7625d5e65ad4ab8b70c8ffc137a054acae6213f4713884d9a	2026-02-18 10:37:38.546583+05:30	20260216164707_fo_target	\N	\N	2026-02-18 10:37:38.544467+05:30	1
fc2d575c-7aba-46fc-9bac-2cb4c9824307	6cad94d8cce12d0ee50728d9c366e4ccfe711b8961d6c83dde6df5a128c76a72	2026-02-18 10:37:38.524917+05:30	20260212091607_audit_system	\N	\N	2026-02-18 10:37:38.518022+05:30	1
2761e057-b661-43a7-8127-7e4ae929225f	0af1a3602a21196471b3d5a85788e2def02f0e2f123bc217fe589684d0170fdf	2026-02-18 10:37:38.531724+05:30	20260213065213_add_fo_gamification	\N	\N	2026-02-18 10:37:38.52527+05:30	1
5ab2786b-5965-48bd-9dec-83d930a8cb5f	1dc1e435a0d5eda4faefeca6bde168cb385714807baac953ebfe5c7cbd403211	2026-02-18 10:37:38.534506+05:30	20260213145255_order_defaults_safe	\N	\N	2026-02-18 10:37:38.531975+05:30	1
5b5707ab-fbf3-41e3-9c53-64d01c29e507	df7527ba6c8ea267efbf48c6d95b2891c6482cd5aed37640a4854f2b2112852c	2026-02-18 10:37:38.549276+05:30	20260217083453_distributor_default_fo	\N	\N	2026-02-18 10:37:38.546856+05:30	1
669def12-fb9e-4bf3-80a5-08ccb50f739c	86c514836826255a3c14596d845130a98266c4384ce4d5e0d99f531b52687a9d	2026-02-18 10:37:38.535732+05:30	20260215052621_add_district_to_user_retailer	\N	\N	2026-02-18 10:37:38.534828+05:30	1
9044eaf0-eb7a-4ac2-b5c3-605ac758019e	c2ae72219caa7918a97bce14bfe6202be668e1c88e80d6a7b4765335e6a8cd0d	2026-02-18 10:37:38.54108+05:30	20260215112632_fo_retailer_audit	\N	\N	2026-02-18 10:37:38.535993+05:30	1
8ef2b1fe-85ab-4e56-80ad-3c34292a9fbe	9f2381f8c798266e3a87b752dd156d0f7099eabba3dec8ece87b7a7a856c59ae	2026-02-20 01:36:23.601395+05:30	20260219200623_add_snapshot_unique	\N	\N	2026-02-20 01:36:23.599803+05:30	1
72f3b19c-ac5a-427f-aa2c-3640f068e96c	1f08400a75c19220523099f55b6d98e1fe7b0744287ce1550b139559d335f3b6	2026-02-18 10:37:38.555441+05:30	20260217094802_assignment_history_relations	\N	\N	2026-02-18 10:37:38.549702+05:30	1
b8d75293-08b7-4da7-88f7-a1c10649ed60	75b875145eac74a398e1bf38816d772533ab6171c2dbd0721ed62736c32a1d81	2026-02-18 10:37:38.558155+05:30	20260218040144_order_level4_idempotency	\N	\N	2026-02-18 10:37:38.555744+05:30	1
\.


--
-- Name: DistributorProductRate DistributorProductRate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DistributorProductRate"
    ADD CONSTRAINT "DistributorProductRate_pkey" PRIMARY KEY (id);


--
-- Name: Distributor Distributor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Distributor"
    ADD CONSTRAINT "Distributor_pkey" PRIMARY KEY (id);


--
-- Name: FieldOfficerRetailerMap FieldOfficerRetailerMap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldOfficerRetailerMap"
    ADD CONSTRAINT "FieldOfficerRetailerMap_pkey" PRIMARY KEY (id);


--
-- Name: FieldOfficerTarget FieldOfficerTarget_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldOfficerTarget"
    ADD CONSTRAINT "FieldOfficerTarget_pkey" PRIMARY KEY (id);


--
-- Name: FoMonthlyTarget FoMonthlyTarget_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FoMonthlyTarget"
    ADD CONSTRAINT "FoMonthlyTarget_pkey" PRIMARY KEY (id);


--
-- Name: FoPointsLedger FoPointsLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FoPointsLedger"
    ADD CONSTRAINT "FoPointsLedger_pkey" PRIMARY KEY (id);


--
-- Name: InboundDispatchItem InboundDispatchItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundDispatchItem"
    ADD CONSTRAINT "InboundDispatchItem_pkey" PRIMARY KEY (id);


--
-- Name: InboundDispatch InboundDispatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundDispatch"
    ADD CONSTRAINT "InboundDispatch_pkey" PRIMARY KEY (id);


--
-- Name: InboundOrderItem InboundOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundOrderItem"
    ADD CONSTRAINT "InboundOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: InboundOrder InboundOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_pkey" PRIMARY KEY (id);


--
-- Name: InboundReceiveItem InboundReceiveItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundReceiveItem"
    ADD CONSTRAINT "InboundReceiveItem_pkey" PRIMARY KEY (id);


--
-- Name: InboundReceive InboundReceive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundReceive"
    ADD CONSTRAINT "InboundReceive_pkey" PRIMARY KEY (id);


--
-- Name: InventoryAdjustmentTxn InventoryAdjustmentTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryAdjustmentTxn"
    ADD CONSTRAINT "InventoryAdjustmentTxn_pkey" PRIMARY KEY (id);


--
-- Name: InventoryBatch InventoryBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryBatch"
    ADD CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY (id);


--
-- Name: InventorySnapshot InventorySnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventorySnapshot"
    ADD CONSTRAINT "InventorySnapshot_pkey" PRIMARY KEY (id);


--
-- Name: InventoryTxnBatchMap InventoryTxnBatchMap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryTxnBatchMap"
    ADD CONSTRAINT "InventoryTxnBatchMap_pkey" PRIMARY KEY (id);


--
-- Name: InventoryTxn InventoryTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryTxn"
    ADD CONSTRAINT "InventoryTxn_pkey" PRIMARY KEY (id);


--
-- Name: Inventory Inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Inventory"
    ADD CONSTRAINT "Inventory_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceItem InvoiceItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: OrderRequestLog OrderRequestLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderRequestLog"
    ADD CONSTRAINT "OrderRequestLog_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: ProductCatalog ProductCatalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductCatalog"
    ADD CONSTRAINT "ProductCatalog_pkey" PRIMARY KEY (id);


--
-- Name: RetailerAssignmentActive RetailerAssignmentActive_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentActive"
    ADD CONSTRAINT "RetailerAssignmentActive_pkey" PRIMARY KEY (id);


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_pkey" PRIMARY KEY (id);


--
-- Name: RetailerLedger RetailerLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerLedger"
    ADD CONSTRAINT "RetailerLedger_pkey" PRIMARY KEY (id);


--
-- Name: RetailerStockAuditItem RetailerStockAuditItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerStockAuditItem"
    ADD CONSTRAINT "RetailerStockAuditItem_pkey" PRIMARY KEY (id);


--
-- Name: RetailerStockAudit RetailerStockAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerStockAudit"
    ADD CONSTRAINT "RetailerStockAudit_pkey" PRIMARY KEY (id);


--
-- Name: RetailerStockBatch RetailerStockBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerStockBatch"
    ADD CONSTRAINT "RetailerStockBatch_pkey" PRIMARY KEY (id);


--
-- Name: RetailerStockSnapshot RetailerStockSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerStockSnapshot"
    ADD CONSTRAINT "RetailerStockSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: Retailer Retailer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Retailer"
    ADD CONSTRAINT "Retailer_pkey" PRIMARY KEY (id);


--
-- Name: RewardCatalog RewardCatalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RewardCatalog"
    ADD CONSTRAINT "RewardCatalog_pkey" PRIMARY KEY (id);


--
-- Name: RewardRedeemRequest RewardRedeemRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RewardRedeemRequest"
    ADD CONSTRAINT "RewardRedeemRequest_pkey" PRIMARY KEY (id);


--
-- Name: SalesTarget SalesTarget_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SalesTarget"
    ADD CONSTRAINT "SalesTarget_pkey" PRIMARY KEY (id);


--
-- Name: StockAuditLine StockAuditLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockAuditLine"
    ADD CONSTRAINT "StockAuditLine_pkey" PRIMARY KEY (id);


--
-- Name: StockAuditTask StockAuditTask_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockAuditTask"
    ADD CONSTRAINT "StockAuditTask_pkey" PRIMARY KEY (id);


--
-- Name: StockAudit StockAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockAudit"
    ADD CONSTRAINT "StockAudit_pkey" PRIMARY KEY (id);


--
-- Name: StockLot StockLot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockLot"
    ADD CONSTRAINT "StockLot_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: DistributorProductRate_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DistributorProductRate_distributorId_idx" ON public."DistributorProductRate" USING btree ("distributorId");


--
-- Name: DistributorProductRate_distributorId_productName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DistributorProductRate_distributorId_productName_key" ON public."DistributorProductRate" USING btree ("distributorId", "productName");


--
-- Name: DistributorProductRate_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DistributorProductRate_productName_idx" ON public."DistributorProductRate" USING btree ("productName");


--
-- Name: Distributor_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Distributor_code_key" ON public."Distributor" USING btree (code);


--
-- Name: Distributor_defaultFoUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Distributor_defaultFoUserId_idx" ON public."Distributor" USING btree ("defaultFoUserId");


--
-- Name: Distributor_gst_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Distributor_gst_key" ON public."Distributor" USING btree (gst);


--
-- Name: Distributor_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Distributor_phone_key" ON public."Distributor" USING btree (phone);


--
-- Name: Distributor_salesManagerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Distributor_salesManagerId_idx" ON public."Distributor" USING btree ("salesManagerId");


--
-- Name: Distributor_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Distributor_status_idx" ON public."Distributor" USING btree (status);


--
-- Name: Distributor_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Distributor_userId_key" ON public."Distributor" USING btree ("userId");


--
-- Name: FieldOfficerRetailerMap_distributorId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FieldOfficerRetailerMap_distributorId_isActive_idx" ON public."FieldOfficerRetailerMap" USING btree ("distributorId", "isActive");


--
-- Name: FieldOfficerRetailerMap_foUserId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FieldOfficerRetailerMap_foUserId_isActive_idx" ON public."FieldOfficerRetailerMap" USING btree ("foUserId", "isActive");


--
-- Name: FieldOfficerRetailerMap_retailerId_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FieldOfficerRetailerMap_retailerId_isActive_idx" ON public."FieldOfficerRetailerMap" USING btree ("retailerId", "isActive");


--
-- Name: FieldOfficerRetailerMap_retailerId_isActive_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FieldOfficerRetailerMap_retailerId_isActive_key" ON public."FieldOfficerRetailerMap" USING btree ("retailerId", "isActive");


--
-- Name: FieldOfficerTarget_foUserId_monthKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FieldOfficerTarget_foUserId_monthKey_idx" ON public."FieldOfficerTarget" USING btree ("foUserId", "monthKey");


--
-- Name: FieldOfficerTarget_foUserId_monthKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FieldOfficerTarget_foUserId_monthKey_key" ON public."FieldOfficerTarget" USING btree ("foUserId", "monthKey");


--
-- Name: FoMonthlyTarget_foUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FoMonthlyTarget_foUserId_idx" ON public."FoMonthlyTarget" USING btree ("foUserId");


--
-- Name: FoMonthlyTarget_foUserId_monthKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FoMonthlyTarget_foUserId_monthKey_key" ON public."FoMonthlyTarget" USING btree ("foUserId", "monthKey");


--
-- Name: FoMonthlyTarget_monthKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FoMonthlyTarget_monthKey_idx" ON public."FoMonthlyTarget" USING btree ("monthKey");


--
-- Name: FoPointsLedger_foUserId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FoPointsLedger_foUserId_date_idx" ON public."FoPointsLedger" USING btree ("foUserId", date);


--
-- Name: FoPointsLedger_refType_refId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FoPointsLedger_refType_refId_idx" ON public."FoPointsLedger" USING btree ("refType", "refId");


--
-- Name: InboundDispatchItem_inboundDispatchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundDispatchItem_inboundDispatchId_idx" ON public."InboundDispatchItem" USING btree ("inboundDispatchId");


--
-- Name: InboundDispatchItem_inboundOrderItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundDispatchItem_inboundOrderItemId_idx" ON public."InboundDispatchItem" USING btree ("inboundOrderItemId");


--
-- Name: InboundDispatch_inboundOrderId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundDispatch_inboundOrderId_createdAt_idx" ON public."InboundDispatch" USING btree ("inboundOrderId", "createdAt");


--
-- Name: InboundDispatch_trackingNo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundDispatch_trackingNo_idx" ON public."InboundDispatch" USING btree ("trackingNo");


--
-- Name: InboundOrderItem_inboundOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundOrderItem_inboundOrderId_idx" ON public."InboundOrderItem" USING btree ("inboundOrderId");


--
-- Name: InboundOrderItem_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundOrderItem_productName_idx" ON public."InboundOrderItem" USING btree ("productName");


--
-- Name: InboundOrder_createdByUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundOrder_createdByUserId_idx" ON public."InboundOrder" USING btree ("createdByUserId");


--
-- Name: InboundOrder_forDistributorId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundOrder_forDistributorId_status_createdAt_idx" ON public."InboundOrder" USING btree ("forDistributorId", status, "createdAt");


--
-- Name: InboundOrder_orderNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InboundOrder_orderNo_key" ON public."InboundOrder" USING btree ("orderNo");


--
-- Name: InboundOrder_paymentStatus_paymentVerified_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundOrder_paymentStatus_paymentVerified_idx" ON public."InboundOrder" USING btree ("paymentStatus", "paymentVerified");


--
-- Name: InboundReceiveItem_inboundReceiveId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundReceiveItem_inboundReceiveId_idx" ON public."InboundReceiveItem" USING btree ("inboundReceiveId");


--
-- Name: InboundReceiveItem_inboundReceiveId_productName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InboundReceiveItem_inboundReceiveId_productName_key" ON public."InboundReceiveItem" USING btree ("inboundReceiveId", "productName");


--
-- Name: InboundReceiveItem_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundReceiveItem_productName_idx" ON public."InboundReceiveItem" USING btree ("productName");


--
-- Name: InboundReceive_distributorId_receivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundReceive_distributorId_receivedAt_idx" ON public."InboundReceive" USING btree ("distributorId", "receivedAt");


--
-- Name: InboundReceive_inboundOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InboundReceive_inboundOrderId_idx" ON public."InboundReceive" USING btree ("inboundOrderId");


--
-- Name: InventoryAdjustmentTxn_refType_refId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryAdjustmentTxn_refType_refId_idx" ON public."InventoryAdjustmentTxn" USING btree ("refType", "refId");


--
-- Name: InventoryAdjustmentTxn_warehouseId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryAdjustmentTxn_warehouseId_createdAt_idx" ON public."InventoryAdjustmentTxn" USING btree ("warehouseId", "createdAt");


--
-- Name: InventoryBatch_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryBatch_distributorId_idx" ON public."InventoryBatch" USING btree ("distributorId");


--
-- Name: InventoryBatch_distributorId_productName_batchNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryBatch_distributorId_productName_batchNo_key" ON public."InventoryBatch" USING btree ("distributorId", "productName", "batchNo");


--
-- Name: InventoryBatch_expiryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryBatch_expiryDate_idx" ON public."InventoryBatch" USING btree ("expiryDate");


--
-- Name: InventorySnapshot_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventorySnapshot_distributorId_idx" ON public."InventorySnapshot" USING btree ("distributorId");


--
-- Name: InventorySnapshot_distributorId_productName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventorySnapshot_distributorId_productName_key" ON public."InventorySnapshot" USING btree ("distributorId", "productName");


--
-- Name: InventorySnapshot_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventorySnapshot_productName_idx" ON public."InventorySnapshot" USING btree ("productName");


--
-- Name: InventoryTxnBatchMap_batchId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryTxnBatchMap_batchId_idx" ON public."InventoryTxnBatchMap" USING btree ("batchId");


--
-- Name: InventoryTxnBatchMap_txnId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryTxnBatchMap_txnId_idx" ON public."InventoryTxnBatchMap" USING btree ("txnId");


--
-- Name: InventoryTxn_distributorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryTxn_distributorId_createdAt_idx" ON public."InventoryTxn" USING btree ("distributorId", "createdAt");


--
-- Name: InventoryTxn_productName_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryTxn_productName_createdAt_idx" ON public."InventoryTxn" USING btree ("productName", "createdAt");


--
-- Name: InventoryTxn_refType_refId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryTxn_refType_refId_idx" ON public."InventoryTxn" USING btree ("refType", "refId");


--
-- Name: Inventory_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Inventory_distributorId_idx" ON public."Inventory" USING btree ("distributorId");


--
-- Name: Inventory_distributorId_productName_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Inventory_distributorId_productName_key" ON public."Inventory" USING btree ("distributorId", "productName");


--
-- Name: InvoiceItem_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InvoiceItem_invoiceId_idx" ON public."InvoiceItem" USING btree ("invoiceId");


--
-- Name: InvoiceItem_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InvoiceItem_productName_idx" ON public."InvoiceItem" USING btree ("productName");


--
-- Name: Invoice_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_distributorId_idx" ON public."Invoice" USING btree ("distributorId");


--
-- Name: Invoice_invoiceNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON public."Invoice" USING btree ("invoiceNo");


--
-- Name: Invoice_invoiceType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_invoiceType_idx" ON public."Invoice" USING btree ("invoiceType");


--
-- Name: Invoice_orderId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_orderId_key" ON public."Invoice" USING btree ("orderId");


--
-- Name: Invoice_retailerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_retailerId_idx" ON public."Invoice" USING btree ("retailerId");


--
-- Name: OrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");


--
-- Name: OrderItem_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderItem_productName_idx" ON public."OrderItem" USING btree ("productName");


--
-- Name: OrderRequestLog_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrderRequestLog_idempotencyKey_key" ON public."OrderRequestLog" USING btree ("idempotencyKey");


--
-- Name: Order_clientRequestHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_clientRequestHash_idx" ON public."Order" USING btree ("clientRequestHash");


--
-- Name: Order_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_distributorId_idx" ON public."Order" USING btree ("distributorId");


--
-- Name: Order_idempotencyKey_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_idempotencyKey_idx" ON public."Order" USING btree ("idempotencyKey");


--
-- Name: Order_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON public."Order" USING btree ("idempotencyKey");


--
-- Name: Order_orderNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_orderNo_key" ON public."Order" USING btree ("orderNo");


--
-- Name: Order_retailerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_retailerId_idx" ON public."Order" USING btree ("retailerId");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: ProductCatalog_barcode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductCatalog_barcode_key" ON public."ProductCatalog" USING btree (barcode);


--
-- Name: ProductCatalog_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCatalog_isActive_idx" ON public."ProductCatalog" USING btree ("isActive");


--
-- Name: ProductCatalog_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProductCatalog_name_idx" ON public."ProductCatalog" USING btree (name);


--
-- Name: ProductCatalog_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductCatalog_name_key" ON public."ProductCatalog" USING btree (name);


--
-- Name: RetailerAssignmentActive_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerAssignmentActive_distributorId_idx" ON public."RetailerAssignmentActive" USING btree ("distributorId");


--
-- Name: RetailerAssignmentActive_foUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerAssignmentActive_foUserId_idx" ON public."RetailerAssignmentActive" USING btree ("foUserId");


--
-- Name: RetailerAssignmentActive_retailerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RetailerAssignmentActive_retailerId_key" ON public."RetailerAssignmentActive" USING btree ("retailerId");


--
-- Name: RetailerAssignmentHistory_actorUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerAssignmentHistory_actorUserId_createdAt_idx" ON public."RetailerAssignmentHistory" USING btree ("actorUserId", "createdAt");


--
-- Name: RetailerAssignmentHistory_distributorId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerAssignmentHistory_distributorId_createdAt_idx" ON public."RetailerAssignmentHistory" USING btree ("distributorId", "createdAt");


--
-- Name: RetailerAssignmentHistory_retailerId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerAssignmentHistory_retailerId_createdAt_idx" ON public."RetailerAssignmentHistory" USING btree ("retailerId", "createdAt");


--
-- Name: RetailerLedger_distributorId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerLedger_distributorId_date_idx" ON public."RetailerLedger" USING btree ("distributorId", date);


--
-- Name: RetailerLedger_retailerId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerLedger_retailerId_date_idx" ON public."RetailerLedger" USING btree ("retailerId", date);


--
-- Name: RetailerLedger_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerLedger_type_idx" ON public."RetailerLedger" USING btree (type);


--
-- Name: RetailerStockAuditItem_auditId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerStockAuditItem_auditId_idx" ON public."RetailerStockAuditItem" USING btree ("auditId");


--
-- Name: RetailerStockAuditItem_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerStockAuditItem_productName_idx" ON public."RetailerStockAuditItem" USING btree ("productName");


--
-- Name: RetailerStockAudit_distributorId_retailerId_auditDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerStockAudit_distributorId_retailerId_auditDate_idx" ON public."RetailerStockAudit" USING btree ("distributorId", "retailerId", "auditDate");


--
-- Name: RetailerStockAudit_fieldOfficerId_auditDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerStockAudit_fieldOfficerId_auditDate_idx" ON public."RetailerStockAudit" USING btree ("fieldOfficerId", "auditDate");


--
-- Name: RetailerStockBatch_expiryDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerStockBatch_expiryDate_idx" ON public."RetailerStockBatch" USING btree ("expiryDate");


--
-- Name: RetailerStockBatch_retailerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerStockBatch_retailerId_idx" ON public."RetailerStockBatch" USING btree ("retailerId");


--
-- Name: RetailerStockBatch_retailerId_productName_batchNo_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RetailerStockBatch_retailerId_productName_batchNo_key" ON public."RetailerStockBatch" USING btree ("retailerId", "productName", "batchNo");


--
-- Name: RetailerStockSnapshot_distributorId_retailerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerStockSnapshot_distributorId_retailerId_idx" ON public."RetailerStockSnapshot" USING btree ("distributorId", "retailerId");


--
-- Name: RetailerStockSnapshot_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RetailerStockSnapshot_productName_idx" ON public."RetailerStockSnapshot" USING btree ("productName");


--
-- Name: Retailer_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Retailer_distributorId_idx" ON public."Retailer" USING btree ("distributorId");


--
-- Name: Retailer_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Retailer_phone_key" ON public."Retailer" USING btree (phone);


--
-- Name: Retailer_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Retailer_status_idx" ON public."Retailer" USING btree (status);


--
-- Name: Retailer_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Retailer_userId_key" ON public."Retailer" USING btree ("userId");


--
-- Name: RewardCatalog_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RewardCatalog_active_idx" ON public."RewardCatalog" USING btree (active);


--
-- Name: RewardRedeemRequest_foUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RewardRedeemRequest_foUserId_createdAt_idx" ON public."RewardRedeemRequest" USING btree ("foUserId", "createdAt");


--
-- Name: RewardRedeemRequest_rewardId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RewardRedeemRequest_rewardId_idx" ON public."RewardRedeemRequest" USING btree ("rewardId");


--
-- Name: RewardRedeemRequest_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RewardRedeemRequest_status_idx" ON public."RewardRedeemRequest" USING btree (status);


--
-- Name: SalesTarget_month_fieldOfficerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SalesTarget_month_fieldOfficerId_key" ON public."SalesTarget" USING btree (month, "fieldOfficerId");


--
-- Name: StockAuditLine_auditId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockAuditLine_auditId_idx" ON public."StockAuditLine" USING btree ("auditId");


--
-- Name: StockAuditLine_mismatchType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockAuditLine_mismatchType_idx" ON public."StockAuditLine" USING btree ("mismatchType");


--
-- Name: StockAuditLine_needsInvestigation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockAuditLine_needsInvestigation_idx" ON public."StockAuditLine" USING btree ("needsInvestigation");


--
-- Name: StockAuditLine_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockAuditLine_productName_idx" ON public."StockAuditLine" USING btree ("productName");


--
-- Name: StockAuditTask_auditId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockAuditTask_auditId_idx" ON public."StockAuditTask" USING btree ("auditId");


--
-- Name: StockAuditTask_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockAuditTask_status_idx" ON public."StockAuditTask" USING btree (status);


--
-- Name: StockAudit_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockAudit_status_idx" ON public."StockAudit" USING btree (status);


--
-- Name: StockAudit_warehouseId_auditDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockAudit_warehouseId_auditDate_idx" ON public."StockAudit" USING btree ("warehouseId", "auditDate");


--
-- Name: StockAudit_warehouseId_monthKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StockAudit_warehouseId_monthKey_key" ON public."StockAudit" USING btree ("warehouseId", "monthKey");


--
-- Name: StockLot_expDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockLot_expDate_idx" ON public."StockLot" USING btree ("expDate");


--
-- Name: StockLot_ownerType_ownerId_productName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockLot_ownerType_ownerId_productName_idx" ON public."StockLot" USING btree ("ownerType", "ownerId", "productName");


--
-- Name: User_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_code_key" ON public."User" USING btree (code);


--
-- Name: User_distributorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_distributorId_idx" ON public."User" USING btree ("distributorId");


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: Distributor Distributor_defaultFoUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Distributor"
    ADD CONSTRAINT "Distributor_defaultFoUserId_fkey" FOREIGN KEY ("defaultFoUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Distributor Distributor_salesManagerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Distributor"
    ADD CONSTRAINT "Distributor_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Distributor Distributor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Distributor"
    ADD CONSTRAINT "Distributor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldOfficerRetailerMap FieldOfficerRetailerMap_assignedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldOfficerRetailerMap"
    ADD CONSTRAINT "FieldOfficerRetailerMap_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldOfficerRetailerMap FieldOfficerRetailerMap_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldOfficerRetailerMap"
    ADD CONSTRAINT "FieldOfficerRetailerMap_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldOfficerRetailerMap FieldOfficerRetailerMap_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldOfficerRetailerMap"
    ADD CONSTRAINT "FieldOfficerRetailerMap_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FoMonthlyTarget FoMonthlyTarget_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FoMonthlyTarget"
    ADD CONSTRAINT "FoMonthlyTarget_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FoPointsLedger FoPointsLedger_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FoPointsLedger"
    ADD CONSTRAINT "FoPointsLedger_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundDispatchItem InboundDispatchItem_inboundDispatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundDispatchItem"
    ADD CONSTRAINT "InboundDispatchItem_inboundDispatchId_fkey" FOREIGN KEY ("inboundDispatchId") REFERENCES public."InboundDispatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundDispatch InboundDispatch_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundDispatch"
    ADD CONSTRAINT "InboundDispatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundDispatch InboundDispatch_inboundOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundDispatch"
    ADD CONSTRAINT "InboundDispatch_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES public."InboundOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundOrderItem InboundOrderItem_inboundOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundOrderItem"
    ADD CONSTRAINT "InboundOrderItem_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES public."InboundOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundOrder InboundOrder_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InboundOrder InboundOrder_dispatchedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_dispatchedByUserId_fkey" FOREIGN KEY ("dispatchedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundOrder InboundOrder_forDistributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_forDistributorId_fkey" FOREIGN KEY ("forDistributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InboundOrder InboundOrder_paymentEnteredByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_paymentEnteredByUserId_fkey" FOREIGN KEY ("paymentEnteredByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundOrder InboundOrder_paymentVerifiedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_paymentVerifiedByUserId_fkey" FOREIGN KEY ("paymentVerifiedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundReceiveItem InboundReceiveItem_inboundReceiveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundReceiveItem"
    ADD CONSTRAINT "InboundReceiveItem_inboundReceiveId_fkey" FOREIGN KEY ("inboundReceiveId") REFERENCES public."InboundReceive"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundReceive InboundReceive_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundReceive"
    ADD CONSTRAINT "InboundReceive_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InboundReceive InboundReceive_inboundOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundReceive"
    ADD CONSTRAINT "InboundReceive_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES public."InboundOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundReceive InboundReceive_receivedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InboundReceive"
    ADD CONSTRAINT "InboundReceive_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryTxnBatchMap InventoryTxnBatchMap_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryTxnBatchMap"
    ADD CONSTRAINT "InventoryTxnBatchMap_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."InventoryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryTxnBatchMap InventoryTxnBatchMap_txnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryTxnBatchMap"
    ADD CONSTRAINT "InventoryTxnBatchMap_txnId_fkey" FOREIGN KEY ("txnId") REFERENCES public."InventoryTxn"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoiceItem InvoiceItem_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invoice Invoice_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RetailerAssignmentActive RetailerAssignmentActive_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentActive"
    ADD CONSTRAINT "RetailerAssignmentActive_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerAssignmentActive RetailerAssignmentActive_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentActive"
    ADD CONSTRAINT "RetailerAssignmentActive_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerAssignmentActive RetailerAssignmentActive_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentActive"
    ADD CONSTRAINT "RetailerAssignmentActive_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_fromFoUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_fromFoUserId_fkey" FOREIGN KEY ("fromFoUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_toFoUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_toFoUserId_fkey" FOREIGN KEY ("toFoUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetailerLedger RetailerLedger_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerLedger"
    ADD CONSTRAINT "RetailerLedger_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerLedger RetailerLedger_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerLedger"
    ADD CONSTRAINT "RetailerLedger_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerStockAuditItem RetailerStockAuditItem_auditId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerStockAuditItem"
    ADD CONSTRAINT "RetailerStockAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES public."RetailerStockAudit"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerStockAudit RetailerStockAudit_fieldOfficerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerStockAudit"
    ADD CONSTRAINT "RetailerStockAudit_fieldOfficerId_fkey" FOREIGN KEY ("fieldOfficerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerStockAudit RetailerStockAudit_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerStockAudit"
    ADD CONSTRAINT "RetailerStockAudit_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerStockSnapshot RetailerStockSnapshot_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RetailerStockSnapshot"
    ADD CONSTRAINT "RetailerStockSnapshot_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Retailer Retailer_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Retailer"
    ADD CONSTRAINT "Retailer_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Retailer Retailer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Retailer"
    ADD CONSTRAINT "Retailer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RewardRedeemRequest RewardRedeemRequest_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RewardRedeemRequest"
    ADD CONSTRAINT "RewardRedeemRequest_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RewardRedeemRequest RewardRedeemRequest_rewardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RewardRedeemRequest"
    ADD CONSTRAINT "RewardRedeemRequest_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES public."RewardCatalog"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockAuditLine StockAuditLine_auditId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockAuditLine"
    ADD CONSTRAINT "StockAuditLine_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES public."StockAudit"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockAuditTask StockAuditTask_auditId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockAuditTask"
    ADD CONSTRAINT "StockAuditTask_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES public."StockAudit"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict hKMsRvFX1d6LnTny95cJAFg8EWj9L7XjKB0dyWdAWyF7VZapQQATH4f814qdGxV

