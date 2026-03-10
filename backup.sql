--
-- PostgreSQL database dump
--

\restrict 3Ddxf9HOB4NqmtH4SQtg0vLZHfZoIzqVotCaAqTQe7eoFu3yYm8rfqvROeuJaXd

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AssignmentEventType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."AssignmentEventType" AS ENUM (
    'ASSIGN',
    'REASSIGN',
    'UNASSIGN'
);


ALTER TYPE public."AssignmentEventType" OWNER TO neondb_owner;

--
-- Name: AuditMismatchType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."AuditMismatchType" AS ENUM (
    'SHORT',
    'EXCESS',
    'MATCH'
);


ALTER TYPE public."AuditMismatchType" OWNER TO neondb_owner;

--
-- Name: AuditReason; Type: TYPE; Schema: public; Owner: neondb_owner
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


ALTER TYPE public."AuditReason" OWNER TO neondb_owner;

--
-- Name: AuditRootCause; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."AuditRootCause" AS ENUM (
    'PROCESS',
    'DATA',
    'HANDLING',
    'SUPPLIER',
    'OTHER'
);


ALTER TYPE public."AuditRootCause" OWNER TO neondb_owner;

--
-- Name: AuditStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."AuditStatus" AS ENUM (
    'DRAFT',
    'IN_PROGRESS',
    'SUBMITTED',
    'APPROVED',
    'CANCELLED'
);


ALTER TYPE public."AuditStatus" OWNER TO neondb_owner;

--
-- Name: AuditTaskStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."AuditTaskStatus" AS ENUM (
    'OPEN',
    'DONE'
);


ALTER TYPE public."AuditTaskStatus" OWNER TO neondb_owner;

--
-- Name: DistributorStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."DistributorStatus" AS ENUM (
    'PENDING',
    'ACTIVE'
);


ALTER TYPE public."DistributorStatus" OWNER TO neondb_owner;

--
-- Name: InboundOrderStatus; Type: TYPE; Schema: public; Owner: neondb_owner
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


ALTER TYPE public."InboundOrderStatus" OWNER TO neondb_owner;

--
-- Name: InventoryTxnType; Type: TYPE; Schema: public; Owner: neondb_owner
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


ALTER TYPE public."InventoryTxnType" OWNER TO neondb_owner;

--
-- Name: InvoiceType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."InvoiceType" AS ENUM (
    'DISTRIBUTOR',
    'RETAILER'
);


ALTER TYPE public."InvoiceType" OWNER TO neondb_owner;

--
-- Name: LedgerType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."LedgerType" AS ENUM (
    'DEBIT',
    'CREDIT'
);


ALTER TYPE public."LedgerType" OWNER TO neondb_owner;

--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'SUBMITTED',
    'CONFIRMED',
    'REJECTED',
    'CANCELLED',
    'DISPATCHED',
    'DELIVERED'
);


ALTER TYPE public."OrderStatus" OWNER TO neondb_owner;

--
-- Name: OwnerType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."OwnerType" AS ENUM (
    'COMPANY',
    'DISTRIBUTOR',
    'RETAILER'
);


ALTER TYPE public."OwnerType" OWNER TO neondb_owner;

--
-- Name: PaymentMode; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."PaymentMode" AS ENUM (
    'CASH',
    'UPI',
    'BANK_TRANSFER',
    'CHEQUE'
);


ALTER TYPE public."PaymentMode" OWNER TO neondb_owner;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIAL',
    'PAID'
);


ALTER TYPE public."PaymentStatus" OWNER TO neondb_owner;

--
-- Name: ReceiveStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ReceiveStatus" AS ENUM (
    'RECEIVED',
    'PARTIAL_RECEIVED'
);


ALTER TYPE public."ReceiveStatus" OWNER TO neondb_owner;

--
-- Name: RetailerStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."RetailerStatus" AS ENUM (
    'PENDING',
    'ACTIVE'
);


ALTER TYPE public."RetailerStatus" OWNER TO neondb_owner;

--
-- Name: RewardRequestStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."RewardRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'FULFILLED'
);


ALTER TYPE public."RewardRequestStatus" OWNER TO neondb_owner;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: neondb_owner
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


ALTER TYPE public."Role" OWNER TO neondb_owner;

--
-- Name: SalesTaskStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."SalesTaskStatus" AS ENUM (
    'OPEN',
    'DONE',
    'OVERDUE',
    'BLOCKED_REMARKS',
    'RESCHEDULED'
);


ALTER TYPE public."SalesTaskStatus" OWNER TO neondb_owner;

--
-- Name: SalesTaskType; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."SalesTaskType" AS ENUM (
    'REACTIVATE_RETAILER',
    'UPSELL_PRODUCTS',
    'CITY_FOCUS',
    'SLOW_MOVER_REVIVAL',
    'NEW_RETAILER_CONVERSION',
    'INVESTIGATE_DROP',
    'DAILY_CLOSE'
);


ALTER TYPE public."SalesTaskType" OWNER TO neondb_owner;

--
-- Name: ShippingMode; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."ShippingMode" AS ENUM (
    'COURIER',
    'TRANSPORT',
    'SELF'
);


ALTER TYPE public."ShippingMode" OWNER TO neondb_owner;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE public."UserStatus" OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Distributor; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."Distributor" OWNER TO neondb_owner;

--
-- Name: DistributorProductRate; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DistributorProductRate" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "productName" text NOT NULL,
    "saleRate" double precision NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DistributorProductRate" OWNER TO neondb_owner;

--
-- Name: FieldOfficerRetailerMap; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."FieldOfficerRetailerMap" OWNER TO neondb_owner;

--
-- Name: FieldOfficerTarget; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."FieldOfficerTarget" OWNER TO neondb_owner;

--
-- Name: FoMonthlyTarget; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."FoMonthlyTarget" (
    id text NOT NULL,
    "foUserId" text NOT NULL,
    "monthKey" text NOT NULL,
    "targetAmt" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FoMonthlyTarget" OWNER TO neondb_owner;

--
-- Name: FoPointsLedger; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."FoPointsLedger" OWNER TO neondb_owner;

--
-- Name: InboundDispatch; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."InboundDispatch" OWNER TO neondb_owner;

--
-- Name: InboundDispatchItem; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."InboundDispatchItem" OWNER TO neondb_owner;

--
-- Name: InboundOrder; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."InboundOrder" OWNER TO neondb_owner;

--
-- Name: InboundOrderItem; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."InboundOrderItem" OWNER TO neondb_owner;

--
-- Name: InboundReceive; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."InboundReceive" (
    id text NOT NULL,
    "inboundOrderId" text NOT NULL,
    "distributorId" text NOT NULL,
    status public."ReceiveStatus" NOT NULL,
    "receivedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "receivedByUserId" text NOT NULL
);


ALTER TABLE public."InboundReceive" OWNER TO neondb_owner;

--
-- Name: InboundReceiveItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."InboundReceiveItem" (
    id text NOT NULL,
    "inboundReceiveId" text NOT NULL,
    "orderedQtyPcs" integer NOT NULL,
    "receivedQtyPcs" integer NOT NULL,
    "shortQtyPcs" integer NOT NULL,
    "productName" text NOT NULL
);


ALTER TABLE public."InboundReceiveItem" OWNER TO neondb_owner;

--
-- Name: Inventory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Inventory" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "productName" text NOT NULL,
    qty integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Inventory" OWNER TO neondb_owner;

--
-- Name: InventoryAdjustmentTxn; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."InventoryAdjustmentTxn" OWNER TO neondb_owner;

--
-- Name: InventoryBatch; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."InventoryBatch" OWNER TO neondb_owner;

--
-- Name: InventorySnapshot; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."InventorySnapshot" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "productName" text NOT NULL,
    "availableQty" integer DEFAULT 0 NOT NULL,
    "reservedQty" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InventorySnapshot" OWNER TO neondb_owner;

--
-- Name: InventoryTxn; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."InventoryTxn" OWNER TO neondb_owner;

--
-- Name: InventoryTxnBatchMap; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."InventoryTxnBatchMap" (
    id text NOT NULL,
    "txnId" text NOT NULL,
    "batchId" text NOT NULL,
    "qtyUsed" integer NOT NULL
);


ALTER TABLE public."InventoryTxnBatchMap" OWNER TO neondb_owner;

--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."Invoice" OWNER TO neondb_owner;

--
-- Name: InvoiceItem; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."InvoiceItem" OWNER TO neondb_owner;

--
-- Name: Order; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."Order" OWNER TO neondb_owner;

--
-- Name: OrderItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productName" text NOT NULL,
    qty integer NOT NULL,
    rate double precision NOT NULL,
    amount double precision NOT NULL
);


ALTER TABLE public."OrderItem" OWNER TO neondb_owner;

--
-- Name: OrderRequestLog; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."OrderRequestLog" OWNER TO neondb_owner;

--
-- Name: ProductCatalog; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."ProductCatalog" OWNER TO neondb_owner;

--
-- Name: Retailer; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."Retailer" OWNER TO neondb_owner;

--
-- Name: RetailerAssignmentActive; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."RetailerAssignmentActive" OWNER TO neondb_owner;

--
-- Name: RetailerAssignmentHistory; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."RetailerAssignmentHistory" OWNER TO neondb_owner;

--
-- Name: RetailerLedger; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."RetailerLedger" OWNER TO neondb_owner;

--
-- Name: RetailerStockAudit; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."RetailerStockAudit" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "fieldOfficerId" text NOT NULL,
    "retailerId" text NOT NULL,
    "auditDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RetailerStockAudit" OWNER TO neondb_owner;

--
-- Name: RetailerStockAuditItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."RetailerStockAuditItem" (
    id text NOT NULL,
    "auditId" text NOT NULL,
    "productName" text NOT NULL,
    "batchNo" text,
    "expiryDate" timestamp(3) without time zone,
    "systemQty" integer NOT NULL,
    "physicalQty" integer NOT NULL,
    variance integer NOT NULL,
    "soldQty" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."RetailerStockAuditItem" OWNER TO neondb_owner;

--
-- Name: RetailerStockBatch; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."RetailerStockBatch" OWNER TO neondb_owner;

--
-- Name: RetailerStockSnapshot; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."RetailerStockSnapshot" OWNER TO neondb_owner;

--
-- Name: RetailerTransferBatch; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."RetailerTransferBatch" (
    id text NOT NULL,
    "distributorId" text NOT NULL,
    "fromFoUserId" text NOT NULL,
    "toFoUserId" text NOT NULL,
    mode text NOT NULL,
    note text,
    reason text,
    status text DEFAULT 'DONE'::text NOT NULL,
    transferred integer DEFAULT 0 NOT NULL,
    "historyCreated" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RetailerTransferBatch" OWNER TO neondb_owner;

--
-- Name: RetailerTransferBatchItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."RetailerTransferBatchItem" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "retailerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RetailerTransferBatchItem" OWNER TO neondb_owner;

--
-- Name: RewardCatalog; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."RewardCatalog" OWNER TO neondb_owner;

--
-- Name: RewardRedeemRequest; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."RewardRedeemRequest" OWNER TO neondb_owner;

--
-- Name: SalesManagerDailyClose; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."SalesManagerDailyClose" (
    id text NOT NULL,
    "salesManagerId" text NOT NULL,
    day timestamp(3) without time zone NOT NULL,
    "closingRemark" text NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    "penaltiesApplied" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SalesManagerDailyClose" OWNER TO neondb_owner;

--
-- Name: SalesManagerTask; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."SalesManagerTask" (
    id text NOT NULL,
    "salesManagerId" text NOT NULL,
    day timestamp(3) without time zone NOT NULL,
    type public."SalesTaskType" NOT NULL,
    title text NOT NULL,
    priority integer DEFAULT 2 NOT NULL,
    "dueAt" timestamp(3) without time zone,
    status public."SalesTaskStatus" DEFAULT 'OPEN'::public."SalesTaskStatus" NOT NULL,
    "retailerIds" text[] DEFAULT ARRAY[]::text[],
    "productNames" text[] DEFAULT ARRAY[]::text[],
    city text,
    "distributorId" text,
    "aiReason" text,
    "expectedImpactMin" integer,
    "expectedImpactMax" integer,
    "remarkQuality" integer DEFAULT 0 NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SalesManagerTask" OWNER TO neondb_owner;

--
-- Name: SalesManagerTaskRemark; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."SalesManagerTaskRemark" (
    id text NOT NULL,
    "taskId" text NOT NULL,
    "remarkText" text NOT NULL,
    "qualityScore" integer DEFAULT 0 NOT NULL,
    "aiFeedback" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SalesManagerTaskRemark" OWNER TO neondb_owner;

--
-- Name: SalesTarget; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."SalesTarget" OWNER TO neondb_owner;

--
-- Name: StockAudit; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."StockAudit" OWNER TO neondb_owner;

--
-- Name: StockAuditLine; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."StockAuditLine" OWNER TO neondb_owner;

--
-- Name: StockAuditTask; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."StockAuditTask" OWNER TO neondb_owner;

--
-- Name: StockLot; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."StockLot" OWNER TO neondb_owner;

--
-- Name: User; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public."User" OWNER TO neondb_owner;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: neondb_owner
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


ALTER TABLE public._prisma_migrations OWNER TO neondb_owner;

--
-- Data for Name: Distributor; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Distributor" (id, code, name, phone, gst, address, city, state, pincode, status, "userId", "createdAt", "updatedAt", "salesManagerId", district, "defaultFoUserId") FROM stdin;
cmlubq0w200023lh1atx8emij	BSD81738504	Vinay	8721967609	03POTPS4565R1ZC	\N	Pimple Saudagar	Maharashtra	411027	PENDING	cmlubq19c00043lh1fqow7big	2026-02-20 03:21:54.434	2026-02-20 03:21:55.365	cmlub1sxy00016xxty28h8cc6	Pune	\N
cmlxqmu6v00026a866oqs99e0	BSD78570601	Savita	9041760000	03POTPS3565R1ZC	\N	Abohar	Punjab	152116	PENDING	cmlxqmuj500046a86yq83nnby	2026-02-22 12:42:38.551	2026-02-22 12:42:39.426	cmlub1sxy00016xxty28h8cc6	Firozpur	\N
\.


--
-- Data for Name: DistributorProductRate; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DistributorProductRate" (id, "distributorId", "productName", "saleRate", "createdAt", "updatedAt") FROM stdin;
cmlutt0pf0000q12d0oa6hw2m	cmlubq0w200023lh1atx8emij	BeautSoul Bamboo Tooth Brush	60	2026-02-20 11:48:07.029	2026-02-20 11:48:07.029
cmlutt7p00001q12d0gfwmdvb	cmlubq0w200023lh1atx8emij	BeautSoul Rose Water Face Toner	75	2026-02-20 11:48:16.308	2026-02-20 11:48:16.308
cmluttfzc0002q12dw63wxffa	cmlubq0w200023lh1atx8emij	BeautSoul SunScreen Gel 50g	162	2026-02-20 11:48:26.826	2026-02-20 11:48:26.826
cmlutto4p0003q12dhluuhm61	cmlubq0w200023lh1atx8emij	BeautSoul SunScreen SunSheild 50g	162	2026-02-20 11:48:37.61	2026-02-20 11:48:37.61
\.


--
-- Data for Name: FieldOfficerRetailerMap; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."FieldOfficerRetailerMap" (id, "foUserId", "retailerId", "distributorId", "assignedByUserId", "assignedAt", "unassignedAt", "isActive", note) FROM stdin;
cmlwhqb1000017hobvysoj4hc	cmlubrgas0001gy3xohu5ic8g	cmlucop66000984tx3iilh7yo	\N	\N	2026-02-21 15:45:37.62	\N	t	\N
cmlwhqbar00037hoblv55pax1	cmlubrgas0001gy3xohu5ic8g	cmluc6g9h000lgy3xdyae9l2l	\N	\N	2026-02-21 15:45:37.971	\N	t	\N
cmlwhqbe000057hob9y2mwx1j	cmlubrgas0001gy3xohu5ic8g	cmlucvxek000j84tx0tla4z97	\N	\N	2026-02-21 15:45:38.088	\N	t	\N
cmlwhqbh700077hobnnk2god8	cmlubrgas0001gy3xohu5ic8g	cmluc0ah2000bgy3xxbqwl8de	\N	\N	2026-02-21 15:45:38.203	\N	t	\N
cmlwhqbk500097hobgyct2wpe	cmlubrgas0001gy3xohu5ic8g	cmluc3aeh000ggy3x7356auha	\N	\N	2026-02-21 15:45:38.309	\N	t	\N
cmlwhqbn1000b7hobzlesot4f	cmlubrgas0001gy3xohu5ic8g	cmluck03c000484txyoa9q9z7	\N	\N	2026-02-21 15:45:38.413	\N	t	\N
cmlwhqbpk000d7hobj90idkcn	cmlubrgas0001gy3xohu5ic8g	cmlubwf5z0006gy3x2x4ixj41	\N	\N	2026-02-21 15:45:38.504	\N	t	\N
cmlwhqbs1000f7hob1nn1332q	cmlubrgas0001gy3xohu5ic8g	cmlucatey000qgy3xw5ule4tg	\N	\N	2026-02-21 15:45:38.594	\N	t	\N
cmlwhqbuk000h7hob3iwou7tv	cmlubrgas0001gy3xohu5ic8g	cmlucrgxl000e84txpbiaboht	\N	\N	2026-02-21 15:45:38.684	\N	t	\N
\.


--
-- Data for Name: FieldOfficerTarget; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."FieldOfficerTarget" (id, "foUserId", "monthKey", "targetValue", locked, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FoMonthlyTarget; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."FoMonthlyTarget" (id, "foUserId", "monthKey", "targetAmt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FoPointsLedger; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."FoPointsLedger" (id, "foUserId", date, type, points, reason, "refType", "refId", "metaJson") FROM stdin;
cmluuxymj0003hugq8qcgpv4q	cmlubrgas0001gy3xohu5ic8g	2026-02-20 12:19:57.452	EARN	19	COLLECTION	ledger	cmluuxxxt0001hugqc3p5vcqg	{"mode": "CASH", "amount": 1497, "retailerId": "cmlucop66000984tx3iilh7yo"}
cmluuyak40007hugqsl4fcz95	cmlubrgas0001gy3xohu5ic8g	2026-02-20 12:20:12.916	EARN	8	COLLECTION	ledger	cmluuya7u0005hugq57tfezfe	{"mode": "CASH", "amount": 399, "retailerId": "cmluc6g9h000lgy3xdyae9l2l"}
cmluv02mw000bhugqkztz284h	cmlubrgas0001gy3xohu5ic8g	2026-02-20 12:21:35.961	EARN	16	COLLECTION	ledger	cmluv02ak0009hugqi07exxer	{"mode": "UPI", "amount": 1197, "retailerId": "cmlucvxek000j84tx0tla4z97"}
cmluv0i96000fhugqk48uq11t	cmlubrgas0001gy3xohu5ic8g	2026-02-20 12:21:56.202	EARN	19	COLLECTION	ledger	cmluv0hwx000dhugqoclmfsv6	{"mode": "CASH", "amount": 1497, "retailerId": "cmluck03c000484txyoa9q9z7"}
cmluv0v8u000jhugqhtzegt26	cmlubrgas0001gy3xohu5ic8g	2026-02-20 12:22:13.038	EARN	19	COLLECTION	ledger	cmluv0uwk000hhugqq0muvhpp	{"mode": "CASH", "amount": 1497, "retailerId": "cmlubwf5z0006gy3x2x4ixj41"}
cmluv1ux5000nhugq49rrn2nz	cmlubrgas0001gy3xohu5ic8g	2026-02-20 12:22:59.273	EARN	35	COLLECTION	ledger	cmluv1ukv000lhugqivvxx0ak	{"mode": "UPI", "amount": 3084, "retailerId": "cmlucrgxl000e84txpbiaboht"}
\.


--
-- Data for Name: InboundDispatch; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InboundDispatch" (id, "inboundOrderId", "createdByUserId", "dispatchDate", "shippingMode", "carrierName", "trackingNo", "lrNo", parcels, "driverName", "driverPhone", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: InboundDispatchItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InboundDispatchItem" (id, "inboundDispatchId", "inboundOrderItemId", "productName", "orderedQtyPcs", "dispatchQtyPcs", "batchNo", "mfgDate", "expiryDate") FROM stdin;
\.


--
-- Data for Name: InboundOrder; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InboundOrder" (id, "orderNo", "forDistributorId", "createdByUserId", status, "expectedAt", "trackingCarrier", "trackingNo", "trackingUrl", notes, "createdAt", "updatedAt", "courierName", "dispatchDate", "lrNo", "shippingMode", "transportName", "paymentStatus", "paymentMode", "paidAmount", "utrNo", "paidAt", "paymentRemarks", "paymentEnteredByUserId", "paymentVerified", "paymentVerifiedAt", "paymentVerifiedByUserId", "dispatchedAt", "dispatchedByUserId") FROM stdin;
cmluh1dz2000110efzskdv4qu	SMO7280623153	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	DISPATCHED	\N	\N	\N	\N	\N	2026-02-20 05:50:42.686	2026-02-20 11:45:25.291	\N	2026-02-20 11:45:00	\N	SELF	\N	PAID	UPI	24696	555555555	2026-02-20 05:51:03.326	\N	cmlub1sxy00016xxty28h8cc6	t	2026-02-20 05:56:15.841	cmlub1szy00026xxtszaak0al	\N	\N
\.


--
-- Data for Name: InboundOrderItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InboundOrderItem" (id, "inboundOrderId", "orderedQtyPcs", "productName", "batchNo", "expiryDate", "mfgDate", rate) FROM stdin;
cmluh1dz2000210efrs6gfzz9	cmluh1dz2000110efzskdv4qu	120	BeautSoul Bamboo Tooth Brush	\N	\N	\N	50
cmluh1dz2000310efd4lnhb3q	cmluh1dz2000110efzskdv4qu	70	BeautSoul Rose Water Face Toner	\N	\N	\N	75
cmluh1dz2000410efmmflsebq	cmluh1dz2000110efzskdv4qu	60	BeautSoul SunScreen Gel 50g	\N	\N	\N	124.5
cmluh1dz2000510efwh2kmjxh	cmluh1dz2000110efzskdv4qu	48	BeautSoul SunScreen SunSheild 50g	\N	\N	\N	124.5
\.


--
-- Data for Name: InboundReceive; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InboundReceive" (id, "inboundOrderId", "distributorId", status, "receivedAt", "receivedByUserId") FROM stdin;
\.


--
-- Data for Name: InboundReceiveItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InboundReceiveItem" (id, "inboundReceiveId", "orderedQtyPcs", "receivedQtyPcs", "shortQtyPcs", "productName") FROM stdin;
\.


--
-- Data for Name: Inventory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Inventory" (id, "distributorId", "productName", qty, "updatedAt") FROM stdin;
cmlutolez000blnvd1hmq5q2c	cmlubq0w200023lh1atx8emij	BeautSoul Bamboo Tooth Brush	51	2026-02-20 12:18:57.082
cmlutolxr000dlnvds4uepm53	cmlubq0w200023lh1atx8emij	BeautSoul Rose Water Face Toner	42	2026-02-20 12:18:57.082
cmlutomza000hlnvd5mw4um19	cmlubq0w200023lh1atx8emij	BeautSoul SunScreen SunSheild 50g	26	2026-02-20 12:18:57.083
cmlutomgi000flnvd765xf6a9	cmlubq0w200023lh1atx8emij	BeautSoul SunScreen Gel 50g	38	2026-02-20 12:18:57.083
\.


--
-- Data for Name: InventoryAdjustmentTxn; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InventoryAdjustmentTxn" (id, "warehouseId", "refType", "refId", "productName", "batchNo", "deltaQty", reason, notes, "actorUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: InventoryBatch; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InventoryBatch" (id, "distributorId", "productName", "batchNo", "expiryDate", qty, "createdAt", "updatedAt", "mfgDate") FROM stdin;
cmlutol8q000alnvdp17r25fz	cmlubq0w200023lh1atx8emij	BeautSoul Bamboo Tooth Brush	BT001	2029-12-30 00:00:00	51	2026-02-20 11:44:40.586	2026-02-20 12:18:54.54	2026-01-01 00:00:00
cmlutolri000clnvdqom313ln	cmlubq0w200023lh1atx8emij	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	42	2026-02-20 11:44:41.262	2026-02-20 12:18:54.963	2025-06-01 00:00:00
cmlutoma9000elnvdkd4jmtq4	cmlubq0w200023lh1atx8emij	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	38	2026-02-20 11:44:41.937	2026-02-20 12:18:55.174	2025-07-01 00:00:00
cmlutomt0000glnvds9ffhvaf	cmlubq0w200023lh1atx8emij	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	26	2026-02-20 11:44:42.612	2026-02-20 12:18:55.386	2025-06-01 00:00:00
\.


--
-- Data for Name: InventorySnapshot; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InventorySnapshot" (id, "distributorId", "productName", "availableQty", "reservedQty", "updatedAt") FROM stdin;
\.


--
-- Data for Name: InventoryTxn; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InventoryTxn" (id, "createdAt", "distributorId", "productName", type, "qtyChange", "qtyReservedChange", "refType", "refId", note, "actorUserId", "actorRole") FROM stdin;
\.


--
-- Data for Name: InventoryTxnBatchMap; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InventoryTxnBatchMap" (id, "txnId", "batchId", "qtyUsed") FROM stdin;
\.


--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Invoice" (id, "invoiceNo", "distributorId", "retailerId", "orderId", "totalAmount", "createdAt", "invoiceType", "paidAmount", "paidAt", "paymentMode", "paymentStatus", remarks, "utrNo") FROM stdin;
cmluusxn00002qnwxvp0no3pm	INV1771589762253	cmlubq0w200023lh1atx8emij	cmlucrgxl000e84txpbiaboht	17fcd652-03ad-438c-b672-81340a9a44c9	3084	2026-02-20 12:16:02.892	RETAILER	0	\N	\N	UNPAID	\N	\N
cmluutl6u00022cccng1zxond	INV1771589792747	cmlubq0w200023lh1atx8emij	cmlucatey000qgy3xw5ule4tg	42fd409c-92f6-403c-aaf0-60532ee4423b	2697	2026-02-20 12:16:33.414	RETAILER	0	\N	\N	UNPAID	\N	\N
cmluuucha0002xtfe3pk8j4jg	INV1771589828111	cmlubq0w200023lh1atx8emij	cmlubwf5z0006gy3x2x4ixj41	6c841526-a892-452e-a4ee-2b63f73ab3e8	1497	2026-02-20 12:17:08.783	RETAILER	0	\N	\N	UNPAID	\N	\N
cmluuv1wx00023kp6ijfqz74u	INV1771589861084	cmlubq0w200023lh1atx8emij	cmluck03c000484txyoa9q9z7	9924f283-08c5-4c04-8282-57862716678b	1497	2026-02-20 12:17:41.746	RETAILER	0	\N	\N	UNPAID	\N	\N
cmluuvnqc000f3kp6yjc9r746	INV1771589889344	cmlubq0w200023lh1atx8emij	cmlucvxek000j84tx0tla4z97	d3468b65-d000-4d28-9f89-8f0720861ac7	2697	2026-02-20 12:18:10.02	RETAILER	0	\N	\N	UNPAID	\N	\N
cmluuw3md000s3kp6lqlffzsn	INV1771589910171	cmlubq0w200023lh1atx8emij	cmluc6g9h000lgy3xdyae9l2l	28659281-8816-4a39-8cf8-0e0c57336b29	399	2026-02-20 12:18:30.613	RETAILER	0	\N	\N	UNPAID	\N	\N
cmluuwlr500133kp6rwudfk46	INV1771589933479	cmlubq0w200023lh1atx8emij	cmlucop66000984tx3iilh7yo	da878375-22a1-4467-afcc-1f29e4c0636f	1497	2026-02-20 12:18:54.113	RETAILER	0	\N	\N	UNPAID	\N	\N
\.


--
-- Data for Name: InvoiceItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."InvoiceItem" (id, "invoiceId", "productName", qty, rate, amount, "batchNo", "expiryDate", "mfgDate") FROM stdin;
cmluusxys0003qnwxzjanya3i	cmluusxn00002qnwxvp0no3pm	BeautSoul Bamboo Tooth Brush	4	60	240	BT001	2029-12-30 00:00:00	2026-01-01 00:00:00
cmluusxys0004qnwxhodzo9uh	cmluusxn00002qnwxvp0no3pm	BeautSoul Rose Water Face Toner	12	75	900	S680	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluusxys0005qnwxwgcw38pk	cmluusxn00002qnwxvp0no3pm	BeautSoul SunScreen Gel 50g	6	162	972	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmluusxys0006qnwx54k83p8s	cmluusxn00002qnwxvp0no3pm	BeautSoul SunScreen SunSheild 50g	6	162	972	SC/6/2	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluutlj600032ccctng6ao18	cmluutl6u00022cccng1zxond	BeautSoul Bamboo Tooth Brush	25	60	1500	BT001	2029-12-30 00:00:00	2026-01-01 00:00:00
cmluutlj600042ccc5rq848tk	cmluutl6u00022cccng1zxond	BeautSoul Rose Water Face Toner	3	75	225	S680	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluutlj600052cccnv4dgj14	cmluutl6u00022cccng1zxond	BeautSoul SunScreen Gel 50g	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmluutlj600062cccqrhzhpmy	cmluutl6u00022cccng1zxond	BeautSoul SunScreen SunSheild 50g	3	162	486	SC/6/2	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuudor0003xtfeies1hzwc	cmluuucha0002xtfe3pk8j4jg	BeautSoul Bamboo Tooth Brush	5	60	300	BT001	2029-12-30 00:00:00	2026-01-01 00:00:00
cmluuudor0004xtfetpwzli2s	cmluuucha0002xtfe3pk8j4jg	BeautSoul Rose Water Face Toner	3	75	225	S680	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuudor0005xtfeqykf4sys	cmluuucha0002xtfe3pk8j4jg	BeautSoul SunScreen Gel 50g	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmluuudor0006xtfez2mq8rw6	cmluuucha0002xtfe3pk8j4jg	BeautSoul SunScreen SunSheild 50g	3	162	486	SC/6/2	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuv34b00033kp6ljlqa4oj	cmluuv1wx00023kp6ijfqz74u	BeautSoul Bamboo Tooth Brush	5	60	300	BT001	2029-12-30 00:00:00	2026-01-01 00:00:00
cmluuv34b00043kp6ks9lzp9i	cmluuv1wx00023kp6ijfqz74u	BeautSoul Rose Water Face Toner	3	75	225	S680	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuv34b00053kp61amc9nrg	cmluuv1wx00023kp6ijfqz74u	BeautSoul SunScreen Gel 50g	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmluuv34b00063kp6ofdhsc26	cmluuv1wx00023kp6ijfqz74u	BeautSoul SunScreen SunSheild 50g	3	162	486	SC/6/2	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuvoxz000g3kp6fzt1zl9b	cmluuvnqc000f3kp6yjc9r746	BeautSoul Bamboo Tooth Brush	25	60	1500	BT001	2029-12-30 00:00:00	2026-01-01 00:00:00
cmluuvoxz000h3kp6n578y18i	cmluuvnqc000f3kp6yjc9r746	BeautSoul Rose Water Face Toner	3	75	225	S680	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuvoxz000i3kp6v92a5ldu	cmluuvnqc000f3kp6yjc9r746	BeautSoul SunScreen Gel 50g	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmluuvoxz000j3kp6hofml0qc	cmluuvnqc000f3kp6yjc9r746	BeautSoul SunScreen SunSheild 50g	3	162	486	SC/6/2	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuw4b1000t3kp675g9ul7u	cmluuw3md000s3kp6lqlffzsn	BeautSoul Rose Water Face Toner	1	75	75	S680	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuw4b1000u3kp61586r4ac	cmluuw3md000s3kp6lqlffzsn	BeautSoul SunScreen Gel 50g	1	162	162	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmluuw4b1000v3kp625i32nej	cmluuw3md000s3kp6lqlffzsn	BeautSoul SunScreen SunSheild 50g	1	162	162	SC/6/2	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuwmwe00143kp65g0r8qgi	cmluuwlr500133kp6rwudfk46	BeautSoul Bamboo Tooth Brush	5	60	300	BT001	2029-12-30 00:00:00	2026-01-01 00:00:00
cmluuwmwe00153kp6w13tnbsi	cmluuwlr500133kp6rwudfk46	BeautSoul Rose Water Face Toner	3	75	225	S680	2027-05-30 00:00:00	2025-06-01 00:00:00
cmluuwmwe00163kp60tw7wv5x	cmluuwlr500133kp6rwudfk46	BeautSoul SunScreen Gel 50g	3	162	486	S712	2027-06-30 00:00:00	2025-07-01 00:00:00
cmluuwmwe00173kp6mj6g2csd	cmluuwlr500133kp6rwudfk46	BeautSoul SunScreen SunSheild 50g	3	162	486	SC/6/2	2027-05-30 00:00:00	2025-06-01 00:00:00
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Order" (id, "orderNo", "distributorId", "retailerId", status, "totalAmount", "paidAmount", "createdAt", "updatedAt", "appVersion", "clientRequestHash", "deviceId", "idempotencyKey", "requestReceivedAt") FROM stdin;
17fcd652-03ad-438c-b672-81340a9a44c9	FO-20260220-89782A	cmlubq0w200023lh1atx8emij	cmlucrgxl000e84txpbiaboht	DISPATCHED	3084	0	2026-02-20 11:55:07.544	2026-02-20 12:16:05.228	\N	\N	\N	\N	\N
42fd409c-92f6-403c-aaf0-60532ee4423b	FO-20260220-B538C2	cmlubq0w200023lh1atx8emij	cmlucatey000qgy3xw5ule4tg	DISPATCHED	2697	0	2026-02-20 11:54:42.745	2026-02-20 12:16:35.859	\N	\N	\N	\N	\N
6c841526-a892-452e-a4ee-2b63f73ab3e8	FO-20260220-4B09A9	cmlubq0w200023lh1atx8emij	cmlubwf5z0006gy3x2x4ixj41	DISPATCHED	1497	0	2026-02-20 11:54:19.075	2026-02-20 12:17:11.019	\N	\N	\N	\N	\N
9924f283-08c5-4c04-8282-57862716678b	FO-20260220-1632EF	cmlubq0w200023lh1atx8emij	cmluck03c000484txyoa9q9z7	DISPATCHED	1497	0	2026-02-20 11:53:40.708	2026-02-20 12:17:43.97	\N	\N	\N	\N	\N
d3468b65-d000-4d28-9f89-8f0720861ac7	FO-20260220-51ACBC	cmlubq0w200023lh1atx8emij	cmlucvxek000j84tx0tla4z97	DISPATCHED	2697	0	2026-02-20 11:53:06.397	2026-02-20 12:18:12.262	\N	\N	\N	\N	\N
28659281-8816-4a39-8cf8-0e0c57336b29	FO-20260220-D49537	cmlubq0w200023lh1atx8emij	cmluc6g9h000lgy3xdyae9l2l	DISPATCHED	399	0	2026-02-20 11:52:43.226	2026-02-20 12:18:32.165	\N	\N	\N	\N	\N
da878375-22a1-4467-afcc-1f29e4c0636f	FO-20260220-7DE6DB	cmlubq0w200023lh1atx8emij	cmlucop66000984tx3iilh7yo	DISPATCHED	1497	0	2026-02-20 11:52:20.885	2026-02-20 12:18:56.234	\N	\N	\N	\N	\N
dc770514-949f-4c5a-baea-39eb90f01931	FO-20260302-0AD939	cmlxqmu6v00026a866oqs99e0	cmm8riuwu00044vo6cgt3o98k	SUBMITTED	900	0	2026-03-02 05:54:29.722	2026-03-02 05:54:29.722	\N	\N	\N	\N	\N
e830f4c7-a4d2-4422-84c0-1beaee2ed6ce	FO-20260307-F8FFD0	cmlxqmu6v00026a866oqs99e0	cmm8riuwu00044vo6cgt3o98k	SUBMITTED	960	0	2026-03-07 08:16:44.528	2026-03-07 08:16:44.528	\N	\N	\N	\N	\N
e9b40e35-56f3-4912-a1ca-8be9ae9c26b1	FO-20260309-A73B3A	cmlxqmu6v00026a866oqs99e0	cmmfvzdsy0004machgbjmqnd5	SUBMITTED	1494	0	2026-03-09 11:47:25.696	2026-03-09 11:47:25.696	\N	\N	\N	\N	\N
e6da2bbe-828b-47e6-a718-a3b159d33f3f	FO-20260309-CFF7AF	cmlxqmu6v00026a866oqs99e0	cmlxqp5fc0004j6451niy8swu	SUBMITTED	230	0	2026-03-09 14:07:24.128	2026-03-09 14:07:24.128	\N	\N	\N	\N	\N
dd80f0b5-6f9c-4c1b-992c-89e57d6cfff3	FO-20260309-B1A7E1	cmlxqmu6v00026a866oqs99e0	cmmfvzdsy0004machgbjmqnd5	SUBMITTED	0	0	2026-03-09 14:06:31.043	2026-03-09 14:09:55.502	\N	\N	\N	\N	\N
\.


--
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."OrderItem" (id, "orderId", "productName", qty, rate, amount) FROM stdin;
cmlutyget000ilnvdm41xhekh	da878375-22a1-4467-afcc-1f29e4c0636f	BeautSoul Bamboo Tooth Brush	5	60	300
cmlutyget000jlnvd6fg7kuy9	da878375-22a1-4467-afcc-1f29e4c0636f	BeautSoul Rose Water Face Toner	3	75	225
cmlutyget000klnvdxuxw6dpb	da878375-22a1-4467-afcc-1f29e4c0636f	BeautSoul SunScreen Gel 50g	3	162	486
cmlutyget000llnvdhfluyhrr	da878375-22a1-4467-afcc-1f29e4c0636f	BeautSoul SunScreen SunSheild 50g	3	162	486
cmlutyxne000mlnvdy7plzwsv	28659281-8816-4a39-8cf8-0e0c57336b29	BeautSoul Rose Water Face Toner	1	75	75
cmlutyxne000nlnvd7ifyx675	28659281-8816-4a39-8cf8-0e0c57336b29	BeautSoul SunScreen Gel 50g	1	162	162
cmlutyxne000olnvdhlpdzjub	28659281-8816-4a39-8cf8-0e0c57336b29	BeautSoul SunScreen SunSheild 50g	1	162	162
cmlutzfj000001f14y4rdf6n0	d3468b65-d000-4d28-9f89-8f0720861ac7	BeautSoul Bamboo Tooth Brush	25	60	1500
cmlutzfj000011f14cj6jqj03	d3468b65-d000-4d28-9f89-8f0720861ac7	BeautSoul Rose Water Face Toner	3	75	225
cmlutzfj000021f14hjziz673	d3468b65-d000-4d28-9f89-8f0720861ac7	BeautSoul SunScreen Gel 50g	3	162	486
cmlutzfj000031f14u7t3gjez	d3468b65-d000-4d28-9f89-8f0720861ac7	BeautSoul SunScreen SunSheild 50g	3	162	486
cmluu060400041f14sg5io27j	9924f283-08c5-4c04-8282-57862716678b	BeautSoul Bamboo Tooth Brush	5	60	300
cmluu060400051f14uoknmgv9	9924f283-08c5-4c04-8282-57862716678b	BeautSoul Rose Water Face Toner	3	75	225
cmluu060400061f1461oo99m2	9924f283-08c5-4c04-8282-57862716678b	BeautSoul SunScreen Gel 50g	3	162	486
cmluu060400071f14hx9nrb83	9924f283-08c5-4c04-8282-57862716678b	BeautSoul SunScreen SunSheild 50g	3	162	486
cmluu0zlv00081f14tdcywqr7	6c841526-a892-452e-a4ee-2b63f73ab3e8	BeautSoul Bamboo Tooth Brush	5	60	300
cmluu0zlv00091f14sojwcagq	6c841526-a892-452e-a4ee-2b63f73ab3e8	BeautSoul Rose Water Face Toner	3	75	225
cmluu0zlv000a1f14pkp79mq9	6c841526-a892-452e-a4ee-2b63f73ab3e8	BeautSoul SunScreen Gel 50g	3	162	486
cmluu0zlv000b1f14q830dq2c	6c841526-a892-452e-a4ee-2b63f73ab3e8	BeautSoul SunScreen SunSheild 50g	3	162	486
cmluu1hvc000c1f14cdu9jlgk	42fd409c-92f6-403c-aaf0-60532ee4423b	BeautSoul Bamboo Tooth Brush	25	60	1500
cmluu1hvc000d1f14c0cwjqpm	42fd409c-92f6-403c-aaf0-60532ee4423b	BeautSoul Rose Water Face Toner	3	75	225
cmluu1hvc000e1f14gm69d4lg	42fd409c-92f6-403c-aaf0-60532ee4423b	BeautSoul SunScreen Gel 50g	3	162	486
cmluu1hvc000f1f14wexpq12k	42fd409c-92f6-403c-aaf0-60532ee4423b	BeautSoul SunScreen SunSheild 50g	3	162	486
cmluu2108000g1f14f7a8kv73	17fcd652-03ad-438c-b672-81340a9a44c9	BeautSoul Bamboo Tooth Brush	4	60	240
cmluu2108000h1f14smf9532l	17fcd652-03ad-438c-b672-81340a9a44c9	BeautSoul Rose Water Face Toner	12	75	900
cmluu2108000i1f14wyks3p7b	17fcd652-03ad-438c-b672-81340a9a44c9	BeautSoul SunScreen Gel 50g	6	162	972
cmluu2108000j1f14hcoqlgjj	17fcd652-03ad-438c-b672-81340a9a44c9	BeautSoul SunScreen SunSheild 50g	6	162	972
cmm8rkrtm00054vo671cohenw	dc770514-949f-4c5a-baea-39eb90f01931	BeautSoul Rose Water Face Toner	12	75	900
cmmg1uynk00039gn3alr2pqp3	e830f4c7-a4d2-4422-84c0-1beaee2ed6ce	BeautSoul Underarms Spray	12	80	960
cmmj49lz40000lmm6gtbqoxgm	e9b40e35-56f3-4912-a1ca-8be9ae9c26b1	BeautSoul SunScreen Gel 50g	6	124.5	747
cmmj49lz50001lmm6he3561di	e9b40e35-56f3-4912-a1ca-8be9ae9c26b1	BeautSoul SunScreen SunSheild 50g	6	124.5	747
cmmj99m8w0000zznhs4z3tgnz	e6da2bbe-828b-47e6-a718-a3b159d33f3f	BeautSoul Bamboo Tooth Brush	1	50	50
cmmj99m8x0001zznhp11yyg0q	e6da2bbe-828b-47e6-a718-a3b159d33f3f	BeautSoul Coffee Soap	1	180	180
\.


--
-- Data for Name: OrderRequestLog; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."OrderRequestLog" (id, "createdAt", endpoint, "requestId", "idempotencyKey", "clientRequestHash", "userId", "retailerId", "distributorId", "deviceId", result, "orderId", error) FROM stdin;
\.


--
-- Data for Name: ProductCatalog; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ProductCatalog" (id, name, barcode, hsn, mrp, "salePrice", "gstRate", "isActive", "createdAt", "updatedAt") FROM stdin;
cmlugtns90000n27m7974arkj	BeautSoul SunScreen SunSheild 50g	\N	\N	249	124.5	\N	t	2026-02-20 05:44:42.151	2026-02-20 05:44:42.151
cmluguw070001n27mur25uhc9	BeautSoul Bamboo Tooth Brush	\N	\N	99	50	\N	t	2026-02-20 05:45:39.24	2026-02-20 05:45:39.24
cmlugvytf0002n27maiglfpc9	BeautSoul SunScreen Gel 50g	\N	\N	249	124.5	\N	t	2026-02-20 05:46:29.537	2026-02-20 05:46:29.537
cmlugwo1p0003n27mi7g99bc4	BeautSoul Rose Water Face Toner	\N	\N	149	75	\N	t	2026-02-20 05:47:02.235	2026-02-20 05:47:02.235
cmmfw5qpm000amach23dr240f	BeautSoul Multani Mitti Soap	\N	\N	320	180	\N	t	2026-03-07 05:37:08.486	2026-03-07 05:37:08.486
cmmfw6yn9000bmach1bzfgmaq	BeautSoul Coffee Soap	\N	\N	320	180	\N	t	2026-03-07 05:38:06.485	2026-03-07 05:38:06.485
cmmfw7zhm000cmachp7tm60cz	BeautSoul Papaya Soap	\N	\N	319	180	\N	t	2026-03-07 05:38:54.234	2026-03-07 05:38:54.234
cmmfw90s7000dmachuahjo3e8	BeautSoul Kumkumadi Soap	\N	\N	319	180	\N	t	2026-03-07 05:39:42.568	2026-03-07 05:39:42.568
cmmfw9gek000emachceen6h71	BeautSoul Rose Soap	\N	\N	319	180	\N	t	2026-03-07 05:40:02.813	2026-03-07 05:40:02.813
cmmfwarlr000fmachox93uih6	BeautSoul Underarms Spray	\N	\N	149	80	\N	t	2026-03-07 05:41:03.983	2026-03-07 05:41:03.983
\.


--
-- Data for Name: Retailer; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Retailer" (id, "userId", name, phone, gst, address, city, state, pincode, status, "distributorId", "createdByRole", "createdById", "activatedByDistributorId", "activatedAt", "createdAt", "updatedAt", district) FROM stdin;
cmlucvxek000j84tx0tla4z97	cmlucvx86000h84tx2zbduv2y	New Shree Kohinoor Medico ( Harish Chaudhary )	9860587503	\N	Shop Number 4 and 5, Serial Number 2/1/16 Vijaylaxmi Dasra Chowk, Sopan Baug Rd, Balewadi, Pune, Maharashtra 411045	New Sangvi	Maharashtra	411045	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:54:29.469	2026-02-20 11:49:45.592	Pune
cmlucrgxl000e84txpbiaboht	cmlucrgkl000c84txgwbkwudy	Velvet Vista Cosmetic	9970365147	\N	Kate Bangar Park, Velvet Vista Building, Krishna Chowk, New Sangvi, Pimple Gurav, Pune, Pimpri-Chinchwad, Maharashtra 411061	New Sangvi	Maharashtra	411061	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:51:01.497	2026-02-20 11:49:57.459	Pune
cmlucop66000984tx3iilh7yo	cmlucoozo000784txbybdxc17	Health Store ( Rupesh Pawar )	9545450621	\N	shastri chowk, Bhosari Alandi Rd, Ramnagar, Bhosari, Pimpri-Chinchwad, Maharashtra 411039	Bhosari	Maharashtra	411039	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:48:52.206	2026-02-20 11:50:10.251	Pune
cmluck03c000484txyoa9q9z7	cmlucjzpj000284tx6umllvq4	Sai Generic Plus Pharmacy Generic Medica ( Depali )	9209015117	\N	shastri chowk, Bhosari Alandi Rd, Ramnagar, Bhosari, Pimpri-Chinchwad, Maharashtra 411039	Bhosari	Maharashtra	411039	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:45:13.08	2026-02-20 11:50:24.895	Pune
cmlucatey000qgy3xw5ule4tg	cmlucat2p000ogy3x1sylgrpu	The Beauty Collection ( Jitu )	8554814849	\N	Shop No: 4, building No: A-3, Tushar Residency, NEar kokane chowk, Rahatani Rd, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:38:04.523	2026-02-20 11:50:39.764	Pune
cmluc6g9h000lgy3xdyae9l2l	cmluc6g3k000jgy3xd9v1gkw5	Krishna Medical ( Narangi Chaudhary )	8806228899	\N	Shop No. 3,Jay Jayanti Residency, Kalewadi - Rahatani Road, opposite Corporater Nana Kate office, Mahadev Mandir Road, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:34:40.854	2026-02-20 11:50:59.773	Pune
cmluc3aeh000ggy3x7356auha	cmluc3a8k000egy3xme6sj0a5	SH. MakeOver (Shivangi)	8888882026	\N	Shop No. 2,Jay Jayanti Residency, Kalewadi - Rahatani Road, opposite Corporater Nana Kate office, Mahadev Mandir Road, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar,	Maharashtra	411027	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:32:13.29	2026-02-20 11:51:11.184	Pune
cmluc0ah2000bgy3xxbqwl8de	cmluc0a580009gy3xfaw0aed5	Royal Chemist ( Mohan Chaudhary )	9175075842	\N	Shop n. 03 Aaditya Avenuner nawale res, Pimple Saudagar, Pune, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:29:53.414	2026-02-20 11:51:23.938	Pune
cmlubwf5z0006gy3x2x4ixj41	cmlubweu80004gy3x8ps7kga2	Shree Sai Generic Medical ( Shekar )	7875581515	\N	Sai Atharva, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	ACTIVE	cmlubq0w200023lh1atx8emij	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-20 03:26:52.871	2026-02-20 11:51:36.071	\N
cmlxqp5fc0004j6451niy8swu	cmlxqp53f0002j645mvmrt2fr	CPC Canten Yogesh	8302730862	\N	\N	Abohar	Punjab	152116	ACTIVE	cmlxqmu6v00026a866oqs99e0	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-02-22 12:44:26.425	2026-02-22 12:45:20.109	Firozpur
cmlxqsn9700096a86hrfoycie	cmlxqsmws00076a86n7vb0eyq	Quality Mart Sitto Road	9815611500	\N	\N	Abohar	Punjab	152116	ACTIVE	cmlxqmu6v00026a866oqs99e0	DISTRIBUTOR	cmlxqmuj500046a86yq83nnby	cmlxqmu6v00026a866oqs99e0	2026-02-22 12:47:09.499	2026-02-22 12:47:09.5	2026-02-22 12:47:32.49	Fazilka
cmlxqutwb00049nx9qloowgq1	cmlxqutko00029nx9eghx2hqk	Vishwash Mart	9463902536	\N	\N	Abohar	Punjab	152116	ACTIVE	cmlxqmu6v00026a866oqs99e0	DISTRIBUTOR	cmlxqmuj500046a86yq83nnby	cmlxqmu6v00026a866oqs99e0	2026-02-22 12:48:51.418	2026-02-22 12:48:51.42	2026-02-22 12:48:51.42	Fazilka
cmlxqwbzm00099nx9ih85pqic	cmlxqwbnz00079nx9qk8e6iie	Mini Mart Abhishak	9780545147	\N	\N	Abohar	Punjab	152116	ACTIVE	cmlxqmu6v00026a866oqs99e0	DISTRIBUTOR	cmlxqmuj500046a86yq83nnby	cmlxqmu6v00026a866oqs99e0	2026-02-22 12:50:01.521	2026-02-22 12:50:01.522	2026-02-22 12:50:01.522	\N
cmmfvzdsy0004machgbjmqnd5	cmmfvzdgw0002mach62jn5zan	JP General Store	9256415558	\N	St No 12 2nd Crossing Main Bazar Abohar	Abohar	Punjab	152116	ACTIVE	cmlxqmu6v00026a866oqs99e0	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-03-07 05:32:13.09	2026-03-07 06:17:44.835	Fazilka
cmm8riuwu00044vo6cgt3o98k	cmm8riujq00024vo642wa3g6m	Khera General Store	9417331964	\N	Main Bazar Near Pipal wala Chowk Jalalabad Fazilka	Jalalabad	Punjab	152024	ACTIVE	cmlxqmu6v00026a866oqs99e0	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-03-02 05:53:00.415	2026-03-07 06:17:58.333	Firozpur
cmmfw1utj0009machilygot5r	cmmfw1unn0007machtevdpyj5	Sheetal Singar Center	9855422182	\N	St No 12 2nd Crossing Main Bazar Abohar	Abohar	Punjab	152116	ACTIVE	cmlxqmu6v00026a866oqs99e0	SALES_MANAGER	cmlub1sxy00016xxty28h8cc6	\N	\N	2026-03-07 05:34:08.456	2026-03-07 06:18:08.337	Fazilka
\.


--
-- Data for Name: RetailerAssignmentActive; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerAssignmentActive" (id, "retailerId", "foUserId", "distributorId", "assignedByUserId", "assignedAt", note) FROM stdin;
cmlxqytpu0001vjnh1xiocy0r	cmlucvxek000j84tx0tla4z97	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxqyu9k0003vjnhvkkmcfpf	cmlucrgxl000e84txpbiaboht	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxqyumk0005vjnhtkborgba	cmlucop66000984tx3iilh7yo	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxqyuzk0007vjnhtbo5td1e	cmluck03c000484txyoa9q9z7	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxqyvcl0009vjnh90hse711	cmlucatey000qgy3xw5ule4tg	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxqyvpk000bvjnhd9ky675n	cmluc6g9h000lgy3xdyae9l2l	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxqyw2k000dvjnhwmyu6kz5	cmluc3aeh000ggy3x7356auha	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxqywfl000fvjnhkpeq657q	cmluc0ah2000bgy3xxbqwl8de	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxqywsl000hvjnh5psighkk	cmlubwf5z0006gy3x2x4ixj41	cmlubrgas0001gy3xohu5ic8g	cmlubq0w200023lh1atx8emij	cmlub1sxy00016xxty28h8cc6	2026-02-22 12:51:57.342	\N
cmlxyfqg10003soizd2ugaqdq	cmlxqp5fc0004j6451niy8swu	cmlxy2oia0001soizrdz1y8sq	cmlxqmu6v00026a866oqs99e0	cmlub1sxy00016xxty28h8cc6	2026-02-22 16:21:03.703	\N
cmlxyfqrl0005soizv0q268na	cmlxqsn9700096a86hrfoycie	cmlxy2oia0001soizrdz1y8sq	cmlxqmu6v00026a866oqs99e0	cmlub1sxy00016xxty28h8cc6	2026-02-22 16:21:03.703	\N
cmlxyfqxn0007soizii2rlqhd	cmlxqutwb00049nx9qloowgq1	cmlxy2oia0001soizrdz1y8sq	cmlxqmu6v00026a866oqs99e0	cmlub1sxy00016xxty28h8cc6	2026-02-22 16:21:03.703	\N
cmlxyfr6n0009soizydb0axbp	cmlxqwbzm00099nx9ih85pqic	cmlxy2oia0001soizrdz1y8sq	cmlxqmu6v00026a866oqs99e0	cmlub1sxy00016xxty28h8cc6	2026-02-22 16:21:03.703	\N
\.


--
-- Data for Name: RetailerAssignmentHistory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerAssignmentHistory" (id, "retailerId", "fromFoUserId", "toFoUserId", "distributorId", "eventType", reason, "actorUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: RetailerLedger; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerLedger" (id, "retailerId", "distributorId", date, type, amount, reference, narration, "createdAt") FROM stdin;
cmluuszro0008qnwxpbllt1o4	cmlucrgxl000e84txpbiaboht	cmlubq0w200023lh1atx8emij	2026-02-20 12:16:05.652	DEBIT	3084	INV1771589762253	Invoice generated for Order FO-20260220-89782A	2026-02-20 12:16:05.652
cmluutnf200082cccc6mn2oca	cmlucatey000qgy3xw5ule4tg	cmlubq0w200023lh1atx8emij	2026-02-20 12:16:36.303	DEBIT	2697	INV1771589792747	Invoice generated for Order FO-20260220-B538C2	2026-02-20 12:16:36.303
cmluuuejv0008xtfer5qcz7vt	cmlubwf5z0006gy3x2x4ixj41	cmlubq0w200023lh1atx8emij	2026-02-20 12:17:11.467	DEBIT	1497	INV1771589828111	Invoice generated for Order FO-20260220-4B09A9	2026-02-20 12:17:11.467
cmluuv3yz00083kp6koeig9hm	cmluck03c000484txyoa9q9z7	cmlubq0w200023lh1atx8emij	2026-02-20 12:17:44.411	DEBIT	1497	INV1771589861084	Invoice generated for Order FO-20260220-1632EF	2026-02-20 12:17:44.411
cmluuvpt1000l3kp62fuvpxw2	cmlucvxek000j84tx0tla4z97	cmlubq0w200023lh1atx8emij	2026-02-20 12:18:12.71	DEBIT	2697	INV1771589889344	Invoice generated for Order FO-20260220-51ACBC	2026-02-20 12:18:12.71
cmluuw4zn000x3kp6hulb2o82	cmluc6g9h000lgy3xdyae9l2l	cmlubq0w200023lh1atx8emij	2026-02-20 12:18:32.387	DEBIT	399	INV1771589910171	Invoice generated for Order FO-20260220-D49537	2026-02-20 12:18:32.387
cmluuwnpt00193kp6ey6kv607	cmlucop66000984tx3iilh7yo	cmlubq0w200023lh1atx8emij	2026-02-20 12:18:56.657	DEBIT	1497	INV1771589933479	Invoice generated for Order FO-20260220-7DE6DB	2026-02-20 12:18:56.657
cmluuxxxt0001hugqc3p5vcqg	cmlucop66000984tx3iilh7yo	cmlubq0w200023lh1atx8emij	2026-02-20 12:19:56.562	CREDIT	1497	\N	FO Collection • CASH	2026-02-20 12:19:56.562
cmluuya7u0005hugq57tfezfe	cmluc6g9h000lgy3xdyae9l2l	cmlubq0w200023lh1atx8emij	2026-02-20 12:20:12.475	CREDIT	399	\N	FO Collection • CASH	2026-02-20 12:20:12.475
cmluv02ak0009hugqi07exxer	cmlucvxek000j84tx0tla4z97	cmlubq0w200023lh1atx8emij	2026-02-20 12:21:35.517	CREDIT	1197	641719410246	FO Collection • UPI	2026-02-20 12:21:35.517
cmluv0hwx000dhugqoclmfsv6	cmluck03c000484txyoa9q9z7	cmlubq0w200023lh1atx8emij	2026-02-20 12:21:55.761	CREDIT	1497	\N	FO Collection • CASH	2026-02-20 12:21:55.761
cmluv0uwk000hhugqq0muvhpp	cmlubwf5z0006gy3x2x4ixj41	cmlubq0w200023lh1atx8emij	2026-02-20 12:22:12.597	CREDIT	1497	\N	FO Collection • CASH	2026-02-20 12:22:12.597
cmluv1ukv000lhugqivvxx0ak	cmlucrgxl000e84txpbiaboht	cmlubq0w200023lh1atx8emij	2026-02-20 12:22:58.831	CREDIT	3084	641243095985	FO Collection • UPI	2026-02-20 12:22:58.831
\.


--
-- Data for Name: RetailerStockAudit; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerStockAudit" (id, "distributorId", "fieldOfficerId", "retailerId", "auditDate", "createdAt") FROM stdin;
cmluv53fl0002qbfxb00d5jjb	cmlubq0w200023lh1atx8emij	cmlubrgas0001gy3xohu5ic8g	cmlubwf5z0006gy3x2x4ixj41	2026-02-20 12:25:30.272	2026-02-20 12:25:30.274
cmluv5xk2000hqbfxkow95fo5	cmlubq0w200023lh1atx8emij	cmlubrgas0001gy3xohu5ic8g	cmluc6g9h000lgy3xdyae9l2l	2026-02-20 12:26:09.313	2026-02-20 12:26:09.314
cmm7qftm40002smvdnnbryx62	cmlubq0w200023lh1atx8emij	cmlubrgas0001gy3xohu5ic8g	cmlucrgxl000e84txpbiaboht	2026-03-01 12:34:52.971	2026-03-01 12:34:52.972
cmm7qgqbd000hsmvd1wpfy5og	cmlubq0w200023lh1atx8emij	cmlubrgas0001gy3xohu5ic8g	cmlucrgxl000e84txpbiaboht	2026-03-01 12:35:35.353	2026-03-01 12:35:35.354
cmm7qhrb2000osmvdyyym8gh3	cmlubq0w200023lh1atx8emij	cmlubrgas0001gy3xohu5ic8g	cmlucvxek000j84tx0tla4z97	2026-03-01 12:36:23.293	2026-03-01 12:36:23.294
\.


--
-- Data for Name: RetailerStockAuditItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerStockAuditItem" (id, "auditId", "productName", "batchNo", "expiryDate", "systemQty", "physicalQty", variance, "soldQty") FROM stdin;
cmluv53fl0003qbfxu1npn9k8	cmluv53fl0002qbfxb00d5jjb	BeautSoul Bamboo Tooth Brush	BT001	2029-12-30 00:00:00	0	4	4	0
cmluv53fl0004qbfxl19je1tc	cmluv53fl0002qbfxb00d5jjb	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	0	3	3	0
cmluv53fl0005qbfxc6ktub1s	cmluv53fl0002qbfxb00d5jjb	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	0	3	3	0
cmluv53fl0006qbfxljh2zl0x	cmluv53fl0002qbfxb00d5jjb	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	0	3	3	0
cmluv5xk2000iqbfxlcwwlqyf	cmluv5xk2000hqbfxkow95fo5	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	0	1	1	0
cmluv5xk2000jqbfxk42tsndy	cmluv5xk2000hqbfxkow95fo5	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	0	1	1	0
cmluv5xk2000kqbfxgczgl2tk	cmluv5xk2000hqbfxkow95fo5	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	0	0	0	0
cmm7qftm40003smvdrk2q3u87	cmm7qftm40002smvdnnbryx62	BeautSoul Bamboo Tooth Brush	BT001	2029-12-30 00:00:00	0	0	0	0
cmm7qftm40004smvd5kamipe1	cmm7qftm40002smvdnnbryx62	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	0	10	10	0
cmm7qftm40005smvds6n25vzc	cmm7qftm40002smvdnnbryx62	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	0	6	6	0
cmm7qftm40006smvdy03zt6sj	cmm7qftm40002smvdnnbryx62	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	0	5	5	0
cmm7qgqbd000ismvd3uyc9lgj	cmm7qgqbd000hsmvd1wpfy5og	BeautSoul Bamboo Tooth Brush	BT001	2029-12-30 00:00:00	0	0	0	0
cmm7qgqbd000jsmvdfrgmog46	cmm7qgqbd000hsmvd1wpfy5og	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	10	10	0	0
cmm7qgqbd000ksmvdkr92rzez	cmm7qgqbd000hsmvd1wpfy5og	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	6	6	0	0
cmm7qgqbd000lsmvd6t2bqim9	cmm7qgqbd000hsmvd1wpfy5og	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	5	5	0	0
cmm7qhrb2000psmvdz42rbp9z	cmm7qhrb2000osmvdyyym8gh3	BeautSoul Bamboo Tooth Brush	BT001	2029-12-30 00:00:00	0	12	12	0
cmm7qhrb2000qsmvdysx8gebh	cmm7qhrb2000osmvdyyym8gh3	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	0	10	10	0
cmm7qhrb2000rsmvd1v4ahm28	cmm7qhrb2000osmvdyyym8gh3	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	0	2	2	0
cmm7qhrb2000ssmvd14md6e7u	cmm7qhrb2000osmvdyyym8gh3	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	0	2	2	0
\.


--
-- Data for Name: RetailerStockBatch; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerStockBatch" (id, "retailerId", "productName", "batchNo", "expiryDate", qty, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RetailerStockSnapshot; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerStockSnapshot" (id, "distributorId", "retailerId", "productName", "batchNo", "expiryDate", qty, "updatedAt") FROM stdin;
cmluv54r00008qbfxw6nsczjd	cmlubq0w200023lh1atx8emij	cmlubwf5z0006gy3x2x4ixj41	BeautSoul Bamboo Tooth Brush	BT001	2029-12-30 00:00:00	4	2026-02-20 12:25:31.98
cmluv558t000aqbfxdxk457yf	cmlubq0w200023lh1atx8emij	cmlubwf5z0006gy3x2x4ixj41	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	3	2026-02-20 12:25:32.621
cmluv55km000cqbfx6qyq0n4k	cmlubq0w200023lh1atx8emij	cmlubwf5z0006gy3x2x4ixj41	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	3	2026-02-20 12:25:33.046
cmluv55wf000eqbfx80pjqok5	cmlubq0w200023lh1atx8emij	cmlubwf5z0006gy3x2x4ixj41	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	3	2026-02-20 12:25:33.471
cmluv5yy0000mqbfxqxxgqhls	cmlubq0w200023lh1atx8emij	cmluc6g9h000lgy3xdyae9l2l	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	1	2026-02-20 12:26:11.112
cmluv5zgm000oqbfxsch24ehp	cmlubq0w200023lh1atx8emij	cmluc6g9h000lgy3xdyae9l2l	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	1	2026-02-20 12:26:11.783
cmluv5zt1000qqbfxzqa6xztf	cmlubq0w200023lh1atx8emij	cmluc6g9h000lgy3xdyae9l2l	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	0	2026-02-20 12:26:12.229
cmm7qfuz30008smvdqatqcuq4	cmlubq0w200023lh1atx8emij	cmlucrgxl000e84txpbiaboht	BeautSoul Bamboo Tooth Brush	BT001	2029-12-30 00:00:00	0	2026-03-01 12:35:37.065
cmm7qfvhf000asmvds8d60jlb	cmlubq0w200023lh1atx8emij	cmlucrgxl000e84txpbiaboht	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	10	2026-03-01 12:35:37.711
cmm7qfvtl000csmvdecu2pn9i	cmlubq0w200023lh1atx8emij	cmlucrgxl000e84txpbiaboht	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	6	2026-03-01 12:35:38.14
cmm7qfw5r000esmvdgd9t7gjs	cmlubq0w200023lh1atx8emij	cmlucrgxl000e84txpbiaboht	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	5	2026-03-01 12:35:38.57
cmm7qhs4s000usmvdpdw3dc3t	cmlubq0w200023lh1atx8emij	cmlucvxek000j84tx0tla4z97	BeautSoul Bamboo Tooth Brush	BT001	2029-12-30 00:00:00	12	2026-03-01 12:36:24.365
cmm7qhsmp000wsmvd5u5hxrk5	cmlubq0w200023lh1atx8emij	cmlucvxek000j84tx0tla4z97	BeautSoul Rose Water Face Toner	S680	2027-05-30 00:00:00	10	2026-03-01 12:36:25.009
cmm7qhsym000ysmvd2y4wkaoo	cmlubq0w200023lh1atx8emij	cmlucvxek000j84tx0tla4z97	BeautSoul SunScreen Gel 50g	S712	2027-06-30 00:00:00	2	2026-03-01 12:36:25.438
cmm7qhtaj0010smvdcw4dgsl5	cmlubq0w200023lh1atx8emij	cmlucvxek000j84tx0tla4z97	BeautSoul SunScreen SunSheild 50g	SC/6/2	2027-05-30 00:00:00	2	2026-03-01 12:36:25.867
\.


--
-- Data for Name: RetailerTransferBatch; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerTransferBatch" (id, "distributorId", "fromFoUserId", "toFoUserId", mode, note, reason, status, transferred, "historyCreated", "createdAt") FROM stdin;
\.


--
-- Data for Name: RetailerTransferBatchItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RetailerTransferBatchItem" (id, "batchId", "retailerId", "createdAt") FROM stdin;
\.


--
-- Data for Name: RewardCatalog; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RewardCatalog" (id, title, subtitle, "pointsCost", active, "imageUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RewardRedeemRequest; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."RewardRedeemRequest" (id, "foUserId", "rewardId", status, note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SalesManagerDailyClose; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."SalesManagerDailyClose" (id, "salesManagerId", day, "closingRemark", score, "penaltiesApplied", "createdAt") FROM stdin;
\.


--
-- Data for Name: SalesManagerTask; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."SalesManagerTask" (id, "salesManagerId", day, type, title, priority, "dueAt", status, "retailerIds", "productNames", city, "distributorId", "aiReason", "expectedImpactMin", "expectedImpactMax", "remarkQuality", "completedAt", "createdAt", "updatedAt") FROM stdin;
cmm7mb60z00002m5pnnvg6r4u	cmlub1sxy00016xxty28h8cc6	2026-02-28 18:30:00	REACTIVATE_RETAILER	Reactivate: priority retailers (Level-4)	1	\N	OPEN	{cmluc0ah2000bgy3xxbqwl8de,cmluc3aeh000ggy3x7356auha,cmlxqp5fc0004j6451niy8swu,cmlxqsn9700096a86hrfoycie,cmlxqutwb00049nx9qloowgq1,cmlxqwbzm00099nx9ih85pqic}	{}	\N	\N	These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.	5000	20000	0	\N	2026-03-01 10:39:17.315	2026-03-01 10:39:17.315
cmm7mb60z00012m5p8am89wem	cmlub1sxy00016xxty28h8cc6	2026-02-28 18:30:00	UPSELL_PRODUCTS	Upsell: retailer-specific recommendations (Level-4)	2	\N	OPEN	{}	{}	\N	\N	Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.	3000	15000	0	\N	2026-03-01 10:39:17.315	2026-03-01 10:39:17.315
cmm7mb60z00022m5p9p895qrs	cmlub1sxy00016xxty28h8cc6	2026-02-28 18:30:00	SLOW_MOVER_REVIVAL	Slow mover revival: blockers + bundling (Level-4)	3	\N	OPEN	{}	{}	\N	\N	Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).	2000	12000	0	\N	2026-03-01 10:39:17.315	2026-03-01 10:39:17.315
cmm8q0sz00000mye0mwzphu1p	cmlub1sxy00016xxty28h8cc6	2026-03-01 18:30:00	REACTIVATE_RETAILER	Reactivate: priority retailers (Level-4)	1	\N	OPEN	{cmluc0ah2000bgy3xxbqwl8de,cmluc3aeh000ggy3x7356auha,cmlxqp5fc0004j6451niy8swu,cmlxqsn9700096a86hrfoycie,cmlxqutwb00049nx9qloowgq1,cmlxqwbzm00099nx9ih85pqic}	{}	\N	\N	These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.	5000	20000	0	\N	2026-03-02 05:10:58.477	2026-03-02 05:10:58.477
cmm8q0sz10001mye0qrkrc94s	cmlub1sxy00016xxty28h8cc6	2026-03-01 18:30:00	UPSELL_PRODUCTS	Upsell: retailer-specific recommendations (Level-4)	2	\N	OPEN	{}	{}	\N	\N	Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.	3000	15000	0	\N	2026-03-02 05:10:58.477	2026-03-02 05:10:58.477
cmm8q0sz10002mye0x2nktw25	cmlub1sxy00016xxty28h8cc6	2026-03-01 18:30:00	SLOW_MOVER_REVIVAL	Slow mover revival: blockers + bundling (Level-4)	3	\N	OPEN	{}	{}	\N	\N	Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).	2000	12000	0	\N	2026-03-02 05:10:58.477	2026-03-02 05:10:58.477
cmma01zu100001tv97fzh9jx3	cmlub1sxy00016xxty28h8cc6	2026-03-02 18:30:00	REACTIVATE_RETAILER	Reactivate: priority retailers (Level-4)	1	\N	OPEN	{cmluc0ah2000bgy3xxbqwl8de,cmluc3aeh000ggy3x7356auha,cmlxqp5fc0004j6451niy8swu,cmlxqsn9700096a86hrfoycie,cmlxqutwb00049nx9qloowgq1,cmlxqwbzm00099nx9ih85pqic}	{"BeautSoul Rose Water Face Toner"}	Jalalabad	\N	These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.	5000	20000	0	\N	2026-03-03 02:39:36.362	2026-03-03 02:39:36.362
cmma01zu200011tv9znzro3l9	cmlub1sxy00016xxty28h8cc6	2026-03-02 18:30:00	UPSELL_PRODUCTS	Upsell: retailer-specific recommendations (Level-4)	2	\N	OPEN	{}	{"BeautSoul Rose Water Face Toner"}	Jalalabad	\N	Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.	3000	15000	0	\N	2026-03-03 02:39:36.362	2026-03-03 02:39:36.362
cmma01zu200021tv939umw3vw	cmlub1sxy00016xxty28h8cc6	2026-03-02 18:30:00	SLOW_MOVER_REVIVAL	Slow mover revival: blockers + bundling (Level-4)	3	\N	OPEN	{}	{"BeautSoul Rose Water Face Toner"}	Jalalabad	\N	Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).	2000	12000	0	\N	2026-03-03 02:39:36.362	2026-03-03 02:39:36.362
cmmccevyu00008tir4q97sc1r	cmlub1sxy00016xxty28h8cc6	2026-03-03 18:30:00	REACTIVATE_RETAILER	Reactivate: priority retailers (Level-4)	1	\N	OPEN	{cmluc0ah2000bgy3xxbqwl8de,cmluc3aeh000ggy3x7356auha,cmlxqp5fc0004j6451niy8swu,cmlxqsn9700096a86hrfoycie,cmlxqutwb00049nx9qloowgq1,cmlxqwbzm00099nx9ih85pqic}	{"BeautSoul Bamboo Tooth Brush","BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.	5000	20000	0	\N	2026-03-04 18:01:05.622	2026-03-04 18:01:05.622
cmmccevyv00018tirn10p45eg	cmlub1sxy00016xxty28h8cc6	2026-03-03 18:30:00	UPSELL_PRODUCTS	Upsell: retailer-specific recommendations (Level-4)	2	\N	OPEN	{}	{"BeautSoul Bamboo Tooth Brush","BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.	3000	15000	0	\N	2026-03-04 18:01:05.622	2026-03-04 18:01:05.622
cmmccevyv00028tir7hift685	cmlub1sxy00016xxty28h8cc6	2026-03-03 18:30:00	SLOW_MOVER_REVIVAL	Slow mover revival: blockers + bundling (Level-4)	3	\N	OPEN	{}	{"BeautSoul Rose Water Face Toner","BeautSoul SunScreen Gel 50g"}	New Sangvi	\N	Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).	2000	12000	0	\N	2026-03-04 18:01:05.622	2026-03-04 18:01:05.622
cmmge7iz90000k7wf21ku33ag	cmlub1sxy00016xxty28h8cc6	2026-03-06 18:30:00	REACTIVATE_RETAILER	Reactivate: priority retailers (Level-4)	1	\N	OPEN	{cmluc0ah2000bgy3xxbqwl8de,cmluc3aeh000ggy3x7356auha,cmlxqp5fc0004j6451niy8swu,cmlxqsn9700096a86hrfoycie,cmlxqutwb00049nx9qloowgq1,cmlxqwbzm00099nx9ih85pqic,cmmfvzdsy0004machgbjmqnd5,cmmfw1utj0009machilygot5r}	{"BeautSoul Bamboo Tooth Brush","BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.	5000	20000	0	\N	2026-03-07 14:02:26.133	2026-03-07 14:02:26.133
cmmge7iza0001k7wfi07d38pe	cmlub1sxy00016xxty28h8cc6	2026-03-06 18:30:00	UPSELL_PRODUCTS	Upsell: retailer-specific recommendations (Level-4)	2	\N	OPEN	{}	{"BeautSoul Bamboo Tooth Brush","BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.	3000	15000	0	\N	2026-03-07 14:02:26.133	2026-03-07 14:02:26.133
cmmge7iza0002k7wfltfnh990	cmlub1sxy00016xxty28h8cc6	2026-03-06 18:30:00	SLOW_MOVER_REVIVAL	Slow mover revival: blockers + bundling (Level-4)	3	\N	OPEN	{}	{"BeautSoul Rose Water Face Toner"}	New Sangvi	\N	Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).	2000	12000	0	\N	2026-03-07 14:02:26.133	2026-03-07 14:02:26.133
cmmgoze4r0000iuggvxcf6grx	cmlub1sxy00016xxty28h8cc6	2026-03-07 18:30:00	REACTIVATE_RETAILER	Reactivate: priority retailers (Level-4)	1	\N	OPEN	{cmluc0ah2000bgy3xxbqwl8de,cmluc3aeh000ggy3x7356auha,cmlxqp5fc0004j6451niy8swu,cmlxqsn9700096a86hrfoycie,cmlxqutwb00049nx9qloowgq1,cmlxqwbzm00099nx9ih85pqic,cmmfvzdsy0004machgbjmqnd5,cmmfw1utj0009machilygot5r}	{"BeautSoul Bamboo Tooth Brush","BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.	5000	20000	0	\N	2026-03-07 19:04:02.38	2026-03-07 19:04:02.38
cmmgoze4s0001iuggdjz44asw	cmlub1sxy00016xxty28h8cc6	2026-03-07 18:30:00	UPSELL_PRODUCTS	Upsell: retailer-specific recommendations (Level-4)	2	\N	OPEN	{}	{"BeautSoul Bamboo Tooth Brush","BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.	3000	15000	0	\N	2026-03-07 19:04:02.38	2026-03-07 19:04:02.38
cmmgoze4s0002iuggh4swrs6x	cmlub1sxy00016xxty28h8cc6	2026-03-07 18:30:00	SLOW_MOVER_REVIVAL	Slow mover revival: blockers + bundling (Level-4)	3	\N	OPEN	{}	{"BeautSoul Rose Water Face Toner"}	New Sangvi	\N	Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).	2000	12000	0	\N	2026-03-07 19:04:02.38	2026-03-07 19:04:02.38
cmmirx0jr000010vjby0m6b5n	cmlub1sxy00016xxty28h8cc6	2026-03-08 18:30:00	REACTIVATE_RETAILER	Reactivate: priority retailers (Level-4)	1	\N	OPEN	{cmluc0ah2000bgy3xxbqwl8de,cmluc3aeh000ggy3x7356auha,cmlxqp5fc0004j6451niy8swu,cmlxqsn9700096a86hrfoycie,cmlxqutwb00049nx9qloowgq1,cmlxqwbzm00099nx9ih85pqic,cmmfvzdsy0004machgbjmqnd5,cmmfw1utj0009machilygot5r}	{"BeautSoul Bamboo Tooth Brush","BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.	5000	20000	0	\N	2026-03-09 06:01:42.663	2026-03-09 06:01:42.663
cmmirx0js000110vjmhsnazoh	cmlub1sxy00016xxty28h8cc6	2026-03-08 18:30:00	UPSELL_PRODUCTS	Upsell: retailer-specific recommendations (Level-4)	2	\N	OPEN	{}	{"BeautSoul Bamboo Tooth Brush","BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.	3000	15000	0	\N	2026-03-09 06:01:42.663	2026-03-09 06:01:42.663
cmmirx0js000210vjeb2tgp00	cmlub1sxy00016xxty28h8cc6	2026-03-08 18:30:00	SLOW_MOVER_REVIVAL	Slow mover revival: blockers + bundling (Level-4)	3	\N	OPEN	{}	{"BeautSoul Rose Water Face Toner"}	New Sangvi	\N	Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).	2000	12000	0	\N	2026-03-09 06:01:42.663	2026-03-09 06:01:42.663
cmmjowt6x0000oixzv1dr2efu	cmlub1sxy00016xxty28h8cc6	2026-03-09 18:30:00	REACTIVATE_RETAILER	Reactivate: priority retailers (Level-4)	1	\N	OPEN	{cmluc0ah2000bgy3xxbqwl8de,cmluc3aeh000ggy3x7356auha,cmlxqsn9700096a86hrfoycie,cmlxqutwb00049nx9qloowgq1,cmlxqwbzm00099nx9ih85pqic,cmmfw1utj0009machilygot5r}	{"BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Bamboo Tooth Brush","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.	5000	20000	0	\N	2026-03-09 21:25:20.457	2026-03-09 21:25:20.457
cmmjowt6y0001oixz4r37faj3	cmlub1sxy00016xxty28h8cc6	2026-03-09 18:30:00	UPSELL_PRODUCTS	Upsell: retailer-specific recommendations (Level-4)	2	\N	OPEN	{}	{"BeautSoul SunScreen Gel 50g","BeautSoul SunScreen SunSheild 50g","BeautSoul Bamboo Tooth Brush","BeautSoul Rose Water Face Toner"}	New Sangvi	\N	Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.	3000	15000	0	\N	2026-03-09 21:25:20.457	2026-03-09 21:25:20.457
cmmjowt6y0002oixzogwlvltq	cmlub1sxy00016xxty28h8cc6	2026-03-09 18:30:00	SLOW_MOVER_REVIVAL	Slow mover revival: blockers + bundling (Level-4)	3	\N	OPEN	{}	{}	New Sangvi	\N	Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).	2000	12000	0	\N	2026-03-09 21:25:20.457	2026-03-09 21:25:20.457
\.


--
-- Data for Name: SalesManagerTaskRemark; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."SalesManagerTaskRemark" (id, "taskId", "remarkText", "qualityScore", "aiFeedback", "createdAt") FROM stdin;
\.


--
-- Data for Name: SalesTarget; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."SalesTarget" (id, month, "targetAmount", "assignedById", "fieldOfficerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockAudit; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."StockAudit" (id, "warehouseId", "monthKey", "auditDate", "snapshotAt", status, "totalSystemQty", "totalPhysicalQty", "totalVarianceQty", "investigationQtyThreshold", "investigationPctThreshold", "createdByUserId", "submittedByUserId", "approvedByUserId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockAuditLine; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."StockAuditLine" (id, "auditId", "productName", "batchNo", "mfgDate", "expDate", "systemQty", "physicalQty", "diffQty", "mismatchType", reason, "rootCause", remarks, "needsInvestigation", "isRepeatIssue", "evidenceUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockAuditTask; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."StockAuditTask" (id, "auditId", title, "assignedToUserId", "dueDate", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockLot; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."StockLot" (id, "ownerType", "ownerId", "batchNo", "expDate", "qtyOnHandPcs", "createdAt", "updatedAt", "productName", "mfgDate") FROM stdin;
cmluh4jrk0000swtbu967pu4i	COMPANY	\N	BT001	2029-12-30 00:00:00	780	2026-02-20 05:53:09.926	2026-02-20 11:44:39.461	BeautSoul Bamboo Tooth Brush	2026-01-01 00:00:00
cmluh5wyz0001swtbr3r7s3uw	COMPANY	\N	S680	2027-05-30 00:00:00	130	2026-02-20 05:54:13.697	2026-02-20 11:44:39.686	BeautSoul Rose Water Face Toner	2025-06-01 00:00:00
cmluh82w90003swtb4a1r4j28	COMPANY	\N	S712	2027-06-30 00:00:00	20	2026-02-20 05:55:54.689	2026-02-20 11:44:39.911	BeautSoul SunScreen Gel 50g	2025-07-01 00:00:00
cmluh6yai0002swtbcwdmruip	COMPANY	\N	SC/6/2	2027-05-30 00:00:00	2	2026-02-20 05:55:02.064	2026-02-20 11:44:40.136	BeautSoul SunScreen SunSheild 50g	2025-06-01 00:00:00
cmmfwhvbi00002plxq107iejw	COMPANY	\N	S930	2028-12-31 00:00:00	60	2026-03-07 05:46:35.384	2026-03-07 05:46:35.384	BeautSoul Coffee Soap	2026-01-01 00:00:00
cmmfwj3oa00012plxzcl9liqm	COMPANY	\N	S933	2028-12-31 00:00:00	60	2026-03-07 05:47:31.832	2026-03-07 05:47:31.832	BeautSoul Papaya Soap	2026-01-01 00:00:00
cmmfwk8j60000863l68eldg1d	COMPANY	\N	S931	2028-12-31 00:00:00	60	2026-03-07 05:48:24.666	2026-03-07 05:48:24.666	BeautSoul Kumkumadi Soap	2026-01-01 00:00:00
cmmfwlc270001863l8tv8z7te	COMPANY	\N	S934	2028-12-31 00:00:00	60	2026-03-07 05:49:17.038	2026-03-07 05:49:17.038	BeautSoul Multani Mitti Soap	2026-01-01 00:00:00
cmmfwmc7u0002863lgo8u80y8	COMPANY	\N	S932	2028-12-31 00:00:00	60	2026-03-07 05:50:03.897	2026-03-07 05:50:03.897	BeautSoul Rose Soap	2026-01-01 00:00:00
cmmfwr8ap0004863lmnd8hqv9	COMPANY	\N	RA24UASP-03	2028-01-31 00:00:00	80	2026-03-07 05:53:51.015	2026-03-07 05:53:51.015	BeautSoul Underarms Spray	2026-02-01 00:00:00
cmmfwow1n0003863leg69v34f	COMPANY	\N	R	2028-01-31 00:00:00	1	2026-03-07 05:52:02.905	2026-03-07 06:14:34.297	BeautSoul Underarms Spray	2026-02-01 00:00:00
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."User" (id, code, name, phone, "passwordHash", role, status, address, city, state, pincode, "distributorId", "createdAt", "updatedAt", district) FROM stdin;
cmlub1sse00006xxted17in23	AD-A8D9	Admin	9000000001	$2b$10$0XABR8ELayiTSyE7f5r7vOTQma8LlVAVElv9/OH/1iGT.OOJezER2	ADMIN	ACTIVE	\N	\N	\N	\N	\N	2026-02-20 03:03:04.189	2026-02-20 03:03:04.189	\N
cmlub1sxy00016xxty28h8cc6	SM-B15C	Sales Manager	9000000002	$2b$10$0XABR8ELayiTSyE7f5r7vOTQma8LlVAVElv9/OH/1iGT.OOJezER2	SALES_MANAGER	ACTIVE	\N	\N	\N	\N	\N	2026-02-20 03:03:04.39	2026-02-20 03:03:04.39	\N
cmlub1szy00026xxtszaak0al	WH-2BCF	Warehouse Manager	9000000003	$2b$10$0XABR8ELayiTSyE7f5r7vOTQma8LlVAVElv9/OH/1iGT.OOJezER2	WAREHOUSE_MANAGER	ACTIVE	\N	\N	\N	\N	\N	2026-02-20 03:03:04.462	2026-02-20 03:03:04.462	\N
cmlubq19c00043lh1fqow7big	BSD81738504	Vinay	8721967609	$2b$10$B1Dpu2IJQsCb1u1a18KqRuBRbBxp0qA7UFir622foyk.ioDd/6Nqa	DISTRIBUTOR	ACTIVE	\N	Pimple Saudagar	Maharashtra	411027	cmlubq0w200023lh1atx8emij	2026-02-20 03:21:54.912	2026-02-20 03:21:54.912	Pune
cmlubrgas0001gy3xohu5ic8g	BSF18872060	Prashant Rinwa	9316690001	$2b$10$ngpyfsmlPGlu5NoqXO4Y7e3895yBGzZ7bK8n9u3HiBMZwKIPkzekS	FIELD_OFFICER	ACTIVE	Prashant Rinwa C/O Gurpreet Kamboj St No 2 Gurdyal Nagar Sito Road Abohar Punjab	Abohar	Punjab	152116	cmlubq0w200023lh1atx8emij	2026-02-20 03:23:01.06	2026-02-20 03:23:01.06	Firozpur
cmlxy2oia0001soizrdz1y8sq	BSF58805851	Prashant Rinwa	9877025858	$2b$10$zmrMzu9qpnLOe9aLR0wJLe4rYFvG9hPZb82jHXqsu0y0wKLTUdXHa	FIELD_OFFICER	ACTIVE	Prashant Rinwa C/O Gurpreet Kamboj St No 2 Gurdyal Nagar Sito Road Abohar Punjab	Abohar	Punjab	152116	cmlxqmu6v00026a866oqs99e0	2026-02-22 16:10:54.993	2026-02-22 16:10:54.993	Firozpur
cmluc3a8k000egy3xme6sj0a5	BSR84491891	SH. MakeOver (Shivangi)	8888882026	$2b$10$Gc8D8WNM5TlJcB//gvxU9OiLKO0UaXwnVuNkMCS5BP5DU7ZH8GhMG	RETAILER	ACTIVE	Shop No. 2,Jay Jayanti Residency, Kalewadi - Rahatani Road, opposite Corporater Nana Kate office, Mahadev Mandir Road, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar,	Maharashtra	411027	cmlubq0w200023lh1atx8emij	2026-02-20 03:32:13.076	2026-02-20 11:51:11.408	Pune
cmlucvx86000h84tx2zbduv2y	BSR57921034	New Shree Kohinoor Medico ( Harish Chaudhary )	9860587503	$2b$10$MTIzafjY1W0dbnu/wiGIbeBN/2CUsN7GTNr/x/RgXGcpejhQqr8lm	RETAILER	ACTIVE	Shop Number 4 and 5, Serial Number 2/1/16 Vijaylaxmi Dasra Chowk, Sopan Baug Rd, Balewadi, Pune, Maharashtra 411045	New Sangvi	Maharashtra	411045	cmlubq0w200023lh1atx8emij	2026-02-20 03:54:29.238	2026-02-20 11:49:45.817	Pune
cmlucrgkl000c84txgwbkwudy	BSR22402148	Velvet Vista Cosmetic	9970365147	$2b$10$GWQM5QOOUeKEZoz4vKbIk.6gczIaEWAOmA53rh.cJQJpkwOfkHFSS	RETAILER	ACTIVE	Kate Bangar Park, Velvet Vista Building, Krishna Chowk, New Sangvi, Pimple Gurav, Pune, Pimpri-Chinchwad, Maharashtra 411061	New Sangvi	Maharashtra	411061	cmlubq0w200023lh1atx8emij	2026-02-20 03:51:01.029	2026-02-20 11:49:57.684	Pune
cmlucoozo000784txbybdxc17	BSR16080890	Health Store ( Rupesh Pawar )	9545450621	$2b$10$Fpr6WA5BpoBFoIPk0TIpZOjcryu9DhQ9ajvq.FD/22ulXzKWhCc1C	RETAILER	ACTIVE	shastri chowk, Bhosari Alandi Rd, Ramnagar, Bhosari, Pimpri-Chinchwad, Maharashtra 411039	Bhosari	Maharashtra	411039	cmlubq0w200023lh1atx8emij	2026-02-20 03:48:51.973	2026-02-20 11:50:10.476	Pune
cmlucjzpj000284tx6umllvq4	BSR39708493	Sai Generic Plus Pharmacy Generic Medica ( Depali )	9209015117	$2b$10$RmpnyrhoPV.YzZtUhDDfQeXeWCx6pwvjvrGdy0LmCws1fU0SAEvda	RETAILER	ACTIVE	shastri chowk, Bhosari Alandi Rd, Ramnagar, Bhosari, Pimpri-Chinchwad, Maharashtra 411039	Bhosari	Maharashtra	411039	cmlubq0w200023lh1atx8emij	2026-02-20 03:45:12.583	2026-02-20 11:50:25.12	Pune
cmlucat2p000ogy3x1sylgrpu	BSR95096775	The Beauty Collection ( Jitu )	8554814849	$2b$10$klpufyPziNU/TEbbRFouTee9IrUf38ysnUeJIUn1zA1OFxJNnfcqy	RETAILER	ACTIVE	Shop No: 4, building No: A-3, Tushar Residency, NEar kokane chowk, Rahatani Rd, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlubq0w200023lh1atx8emij	2026-02-20 03:38:04.082	2026-02-20 11:50:39.989	Pune
cmluc6g3k000jgy3xd9v1gkw5	BSR58319235	Krishna Medical ( Narangi Chaudhary )	8806228899	$2b$10$lccFB6T8hJp2EnHRPhVVwun8i0RvUHlm6gyk2U4tzNRiGHfhp.ebq	RETAILER	ACTIVE	Shop No. 3,Jay Jayanti Residency, Kalewadi - Rahatani Road, opposite Corporater Nana Kate office, Mahadev Mandir Road, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlubq0w200023lh1atx8emij	2026-02-20 03:34:40.64	2026-02-20 11:50:59.997	Pune
cmluc0a580009gy3xfaw0aed5	BSR28904812	Royal Chemist ( Mohan Chaudhary )	9175075842	$2b$10$cv.sD3NtkwkA1NTkDVc5YeUFImF6cspmzQMQA.XXfpdDgHNOcdgnq	RETAILER	ACTIVE	Shop n. 03 Aaditya Avenuner nawale res, Pimple Saudagar, Pune, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlubq0w200023lh1atx8emij	2026-02-20 03:29:52.988	2026-02-20 11:51:24.163	Pune
cmlubweu80004gy3x8ps7kga2	BSR04196059	Shree Sai Generic Medical ( Shekar )	7875581515	$2b$10$8T461elJWhx3vjAx9AueRu5DZp/KZd2lFAVOJf9WR6TApPcmROZDu	RETAILER	ACTIVE	Sai Atharva, Pimple Saudagar, Pimpri-Chinchwad, Maharashtra 411027	Pimple Saudagar	Maharashtra	411027	cmlubq0w200023lh1atx8emij	2026-02-20 03:26:52.448	2026-02-20 11:51:36.296	\N
cmlxqmuj500046a86yq83nnby	BSD78570601	Savita	9041760000	$2b$10$NpnhC48RpqQu3wGuJmqkYOjw2YJ3NAIgTSHw4TDho0KKGEJnOFd7K	DISTRIBUTOR	ACTIVE	\N	Abohar	Punjab	152116	cmlxqmu6v00026a866oqs99e0	2026-02-22 12:42:38.993	2026-02-22 12:42:38.993	Firozpur
cmlxqp53f0002j645mvmrt2fr	BSR08936242	CPC Canten Yogesh	8302730862	$2b$10$x/lqkX7SFNsvr8KZzAQUQuZJQTrK7pNM6kVCAOKWsqnBgZ4dHqDnK	RETAILER	ACTIVE	\N	Abohar	Punjab	152116	cmlxqmu6v00026a866oqs99e0	2026-02-22 12:44:25.995	2026-02-22 12:45:20.557	Firozpur
cmlxqsmws00076a86n7vb0eyq	RTL51909922	Quality Mart Sitto Road	9815611500	$2b$10$iquJcBW2G9izJq2wkMqcE.GEUxweyROEIPzOr75IAvTovvSrYdoza	RETAILER	ACTIVE	\N	Abohar	Punjab	152116	cmlxqmu6v00026a866oqs99e0	2026-02-22 12:47:09.053	2026-02-22 12:47:32.91	Fazilka
cmlxqutko00029nx9eghx2hqk	RTL25950047	Vishwash Mart	9463902536	$2b$10$uUp4em4x7WGDIZApjScZMuUPpA3WS8zMdr17AC2K0fBdLpQFas3OG	RETAILER	ACTIVE	\N	Abohar	Punjab	152116	cmlxqmu6v00026a866oqs99e0	2026-02-22 12:48:51	2026-02-22 12:48:51	Fazilka
cmlxqwbnz00079nx9qk8e6iie	RTL37250257	Mini Mart Abhishak	9780545147	$2b$10$69FMhUv8kQ0QQN.k/dGhUeQI/.eGQoVkZUmn8ar/ai5ndBVPpkPUq	RETAILER	ACTIVE	\N	Abohar	Punjab	152116	cmlxqmu6v00026a866oqs99e0	2026-02-22 12:50:01.104	2026-02-22 12:50:01.104	\N
cmmfvzdgw0002mach62jn5zan	BSR78984075	JP General Store	9256415558	$2b$10$PR/guZcGTIKHbhaZIV665usPJW5Y0uL6noU2dgn0Lart0hIFtbozW	RETAILER	ACTIVE	St No 12 2nd Crossing Main Bazar Abohar	Abohar	Punjab	152116	cmlxqmu6v00026a866oqs99e0	2026-03-07 05:32:12.656	2026-03-07 06:17:45.06	Fazilka
cmm8riujq00024vo642wa3g6m	BSR48434880	Khera General Store	9417331964	$2b$10$KLxPzxhc4cH9HdTB/hG5s.B99N8MkbWUfUS9s5zdX4Q8inTRE91wq	RETAILER	ACTIVE	Main Bazar Near Pipal wala Chowk Jalalabad Fazilka	Jalalabad	Punjab	152024	cmlxqmu6v00026a866oqs99e0	2026-03-02 05:52:59.942	2026-03-07 06:17:58.558	Firozpur
cmmfw1unn0007machtevdpyj5	BSR26080069	Sheetal Singar Center	9855422182	$2b$10$ofUfDSJOWmtFcaYGfGEVKuj4aLVamzQeSHjS.0h0r.RHJGIkpBHBW	RETAILER	ACTIVE	St No 12 2nd Crossing Main Bazar Abohar	Abohar	Punjab	152116	cmlxqmu6v00026a866oqs99e0	2026-03-07 05:34:08.243	2026-03-07 06:18:08.561	Fazilka
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
63ef3757-0456-47a7-a74b-e2df07b5fd23	aa15e7f5487c4ec526d21d0ccb7d86ee2833a7f52ef03d5f1368c4934a3bc244	2026-02-20 02:41:37.738313+00	20260206123745_add_distributor_product_rate	\N	\N	2026-02-20 02:41:37.41084+00	1
86eae52c-7d21-45f1-8777-0c4608b33c55	f2935701f245ac0891bb846511ce6dd020c6f51b3d0bbb81cecc916b9d51564d	2026-02-20 02:41:32.195217+00	20260126154920_add_user_status	\N	\N	2026-02-20 02:41:31.797157+00	1
b2053c8a-6dbf-41d4-9480-8aed8f2f7aa7	f3443b0c9b674f3e20bf705a4707784bd3ffa0ba1b081ac1ffce9cd61ddbc519	2026-02-20 02:41:32.677547+00	20260126165414_add_inventory_and_invoices	\N	\N	2026-02-20 02:41:32.326322+00	1
f9c762a8-f150-4cd6-9f41-9769cffe2c82	7c53909a0723b2f0c97fe5c3c833eaac6d4cd0e768a9921ef939d75166882809	2026-02-20 02:41:44.220772+00	20260218044718_make_order_idempotency_not_null	\N	\N	2026-02-20 02:41:43.885576+00	1
20fcaa08-d4e8-45a3-b1db-1080b54c8c49	f549151817f0e7c2ac2b24f04d50bd861d2a4a619d56531685a2c59a7b14c7ea	2026-02-20 02:41:33.181623+00	20260126190537_stock_inbound	\N	\N	2026-02-20 02:41:32.806374+00	1
dd38f45a-f1dc-4b82-9353-4c86fe5387d3	2d0f9954d0e7162848ea9129912b74f8306a82cbc096328aea89ee0757c07bda	2026-02-20 02:41:38.198434+00	20260211032953_add_distributor_district_optional	\N	\N	2026-02-20 02:41:37.866779+00	1
8a00cf26-1525-4897-a5bf-f8a10b803daa	5c06391f2e799c0e8f073760d5a8e473855bd84a0ea05cd5a8d5ba4855634d5c	2026-02-20 02:41:33.645885+00	20260127150123_add_retailer_ledger	\N	\N	2026-02-20 02:41:33.310902+00	1
9d2075e0-5ac6-4c25-89fc-11a57f5cf515	4fc3cf5eaaa163467377ab557e4f9f7c461f2836e83e3376ccd60118c2ee3370	2026-02-20 02:41:34.107801+00	20260129163225_fix_schema	\N	\N	2026-02-20 02:41:33.774227+00	1
f1266b91-bd65-48ef-9c33-8b9433ab35bd	5be2e96e60d5890c8d0ee2ceabb6551eba26b85b944df1feae25bbff4b337709	2026-02-20 02:41:41.918133+00	20260216144639_add_fo_retailer_map	\N	\N	2026-02-20 02:41:41.585269+00	1
3e68744d-3a63-4ecc-b0c6-98b6663c0632	317485ac3f3118f59c26d8da3821d28e07fe695b546976466958f91d4c069f15	2026-02-20 02:41:34.563042+00	20260131024209_invoice_type_optional_retailer_order	\N	\N	2026-02-20 02:41:34.234628+00	1
9b7a7cdf-ec31-4189-99f1-c8eeafebca84	d59379eb466b95cf8d51a74ff2d0ca0d8999947b09bbfb8d7d9c0a1530da716d	2026-02-20 02:41:38.64177+00	20260211180615_add_shippingmode_self	\N	\N	2026-02-20 02:41:38.322531+00	1
d66074d2-ad8f-4617-baa4-266a0a0c47c9	e06d4bed76d150ff3e7922984843147e984e414e2942a5001bd03c8e2e22af08	2026-02-20 02:41:35.017833+00	20260131044140_warehouse_payment_dispatch_fields	\N	\N	2026-02-20 02:41:34.696037+00	1
11613a8d-4fe6-419c-bb5c-fbc010532ea4	51f835a5dc8e53b1aa38cf493a2560fa229ec295a07aa9c596d05931b06a90cd	2026-02-20 02:41:35.461651+00	20260201192735_add_inbound_payment_verified_status	\N	\N	2026-02-20 02:41:35.146291+00	1
e8a7b682-e985-4693-bd08-15043e60d6fe	ce0e9e448e208b2d49412d4033e63b3275a0cbb356e740386b6943cdcaa11202	2026-02-20 02:41:35.909648+00	20260201204855_fix_inbound_payment_columns	\N	\N	2026-02-20 02:41:35.591281+00	1
ee497b91-ff8b-44fd-bb24-948db4dca5be	fcf7af6735b79a3bae4018d1a7902e2a3d4c868f2bed5af6168daf0b7569580a	2026-02-20 02:41:39.106038+00	20260212084254_inventory_advanced	\N	\N	2026-02-20 02:41:38.766261+00	1
9c6c0eef-00b7-4466-81a8-059d35335ae8	490cfdf96cc48b67ae5e14fcda0401b9eab1b4603ddd8de1f4f351dcd5a875c8	2026-02-20 02:41:36.365802+00	20260201210405_inbound_order_payment_fields	\N	\N	2026-02-20 02:41:36.038099+00	1
a618a2b4-62c4-4286-8078-5a58cef2c9e2	391b3547d2a120d95d5cc4fde313a8620ae368ccc67c34c05cc56f7f2cc9789b	2026-02-20 02:41:36.833824+00	20260203051351_inbound_dispatch_models	\N	\N	2026-02-20 02:41:36.490519+00	1
8e5d560a-7c0b-4d66-a1e6-8aa81813b208	b6e10d2b2f79ec3cc52a25dd2e202a365839d5fe34e88eb268ab884ecdd2184b	2026-02-20 02:41:37.281836+00	20260203163426_add_mfg_date_to_batches	\N	\N	2026-02-20 02:41:36.962111+00	1
7234ee1a-a745-4f0d-b4fe-d0bdfdc116e8	7dd41693781478d7625d5e65ad4ab8b70c8ffc137a054acae6213f4713884d9a	2026-02-20 02:41:42.36868+00	20260216164707_fo_target	\N	\N	2026-02-20 02:41:42.045469+00	1
3e82f53f-ffbc-4804-91b3-1281a198095d	6cad94d8cce12d0ee50728d9c366e4ccfe711b8961d6c83dde6df5a128c76a72	2026-02-20 02:41:39.590072+00	20260212091607_audit_system	\N	\N	2026-02-20 02:41:39.234242+00	1
b21b4cc8-8e6e-4c37-857e-daf93e58272b	0af1a3602a21196471b3d5a85788e2def02f0e2f123bc217fe589684d0170fdf	2026-02-20 02:41:40.070441+00	20260213065213_add_fo_gamification	\N	\N	2026-02-20 02:41:39.718309+00	1
372565e6-4ccd-422c-b0fb-5b8001898c24	1dc1e435a0d5eda4faefeca6bde168cb385714807baac953ebfe5c7cbd403211	2026-02-20 02:41:40.53732+00	20260213145255_order_defaults_safe	\N	\N	2026-02-20 02:41:40.197517+00	1
ee276091-3feb-4726-b063-dbef328f874d	df7527ba6c8ea267efbf48c6d95b2891c6482cd5aed37640a4854f2b2112852c	2026-02-20 02:41:42.832847+00	20260217083453_distributor_default_fo	\N	\N	2026-02-20 02:41:42.497364+00	1
31adee3f-d8a1-4253-b2cf-8b0a6090b679	86c514836826255a3c14596d845130a98266c4384ce4d5e0d99f531b52687a9d	2026-02-20 02:41:40.988805+00	20260215052621_add_district_to_user_retailer	\N	\N	2026-02-20 02:41:40.668839+00	1
3f151c2f-bb3a-4b18-8f18-39d0f7b255fa	c2ae72219caa7918a97bce14bfe6202be668e1c88e80d6a7b4765335e6a8cd0d	2026-02-20 02:41:41.456009+00	20260215112632_fo_retailer_audit	\N	\N	2026-02-20 02:41:41.117813+00	1
b8b72b07-4a68-4a9b-a7a2-a59be0d27768	9f2381f8c798266e3a87b752dd156d0f7099eabba3dec8ece87b7a7a856c59ae	2026-02-20 02:41:44.668981+00	20260219200623_add_snapshot_unique	\N	\N	2026-02-20 02:41:44.34985+00	1
3f4db925-0c38-4984-9113-1a1b7722fe9b	1f08400a75c19220523099f55b6d98e1fe7b0744287ce1550b139559d335f3b6	2026-02-20 02:41:43.300926+00	20260217094802_assignment_history_relations	\N	\N	2026-02-20 02:41:42.961355+00	1
f92e1ec8-daef-4a50-a3ac-bc5aafed57b1	75b875145eac74a398e1bf38816d772533ab6171c2dbd0721ed62736c32a1d81	2026-02-20 02:41:43.756903+00	20260218040144_order_level4_idempotency	\N	\N	2026-02-20 02:41:43.429086+00	1
531c20c9-dfc1-408a-bce7-0281a736384d	b26dfec8cfe5510a8ef821132b7203d89b6d0121a6abdae13ae24a61bbb5ba25	2026-03-01 10:38:29.042154+00	20260224171518_add_sales_manager_tasks	\N	\N	2026-03-01 10:38:28.443698+00	1
a2e5fc59-6a61-4f78-a42d-1ac833edc8f0	2b661e243f53ebccc31db19a05d0dd98f7f927bdd0fbe4907f376970aed61c77	2026-03-01 10:38:27.322983+00	20260224163210_sm_ai_tasks	\N	\N	2026-03-01 10:38:26.592819+00	1
b9fa5852-897d-40ae-96cb-f5e5d89f702f	9c4326b9939df2715a36e4d099e2e9d61b9e4a439dd3e9300c3d56744ab0723f	2026-03-01 10:38:28.181268+00	20260224170335_add_sales_manager_ai_tasks	\N	\N	2026-03-01 10:38:27.561307+00	1
e7be0d12-36da-4057-ba88-aa76ff188bec	468481fc8f9cb82128cf8d1ee11329267a722d8f327ba792344bbdd3d22134e8	2026-03-01 10:38:29.871613+00	20260225165315_add_sales_manager_ai_tasks	\N	\N	2026-03-01 10:38:29.281216+00	1
\.


--
-- Name: DistributorProductRate DistributorProductRate_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DistributorProductRate"
    ADD CONSTRAINT "DistributorProductRate_pkey" PRIMARY KEY (id);


--
-- Name: Distributor Distributor_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Distributor"
    ADD CONSTRAINT "Distributor_pkey" PRIMARY KEY (id);


--
-- Name: FieldOfficerRetailerMap FieldOfficerRetailerMap_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FieldOfficerRetailerMap"
    ADD CONSTRAINT "FieldOfficerRetailerMap_pkey" PRIMARY KEY (id);


--
-- Name: FieldOfficerTarget FieldOfficerTarget_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FieldOfficerTarget"
    ADD CONSTRAINT "FieldOfficerTarget_pkey" PRIMARY KEY (id);


--
-- Name: FoMonthlyTarget FoMonthlyTarget_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FoMonthlyTarget"
    ADD CONSTRAINT "FoMonthlyTarget_pkey" PRIMARY KEY (id);


--
-- Name: FoPointsLedger FoPointsLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FoPointsLedger"
    ADD CONSTRAINT "FoPointsLedger_pkey" PRIMARY KEY (id);


--
-- Name: InboundDispatchItem InboundDispatchItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundDispatchItem"
    ADD CONSTRAINT "InboundDispatchItem_pkey" PRIMARY KEY (id);


--
-- Name: InboundDispatch InboundDispatch_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundDispatch"
    ADD CONSTRAINT "InboundDispatch_pkey" PRIMARY KEY (id);


--
-- Name: InboundOrderItem InboundOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundOrderItem"
    ADD CONSTRAINT "InboundOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: InboundOrder InboundOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_pkey" PRIMARY KEY (id);


--
-- Name: InboundReceiveItem InboundReceiveItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundReceiveItem"
    ADD CONSTRAINT "InboundReceiveItem_pkey" PRIMARY KEY (id);


--
-- Name: InboundReceive InboundReceive_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundReceive"
    ADD CONSTRAINT "InboundReceive_pkey" PRIMARY KEY (id);


--
-- Name: InventoryAdjustmentTxn InventoryAdjustmentTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InventoryAdjustmentTxn"
    ADD CONSTRAINT "InventoryAdjustmentTxn_pkey" PRIMARY KEY (id);


--
-- Name: InventoryBatch InventoryBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InventoryBatch"
    ADD CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY (id);


--
-- Name: InventorySnapshot InventorySnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InventorySnapshot"
    ADD CONSTRAINT "InventorySnapshot_pkey" PRIMARY KEY (id);


--
-- Name: InventoryTxnBatchMap InventoryTxnBatchMap_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InventoryTxnBatchMap"
    ADD CONSTRAINT "InventoryTxnBatchMap_pkey" PRIMARY KEY (id);


--
-- Name: InventoryTxn InventoryTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InventoryTxn"
    ADD CONSTRAINT "InventoryTxn_pkey" PRIMARY KEY (id);


--
-- Name: Inventory Inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Inventory"
    ADD CONSTRAINT "Inventory_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceItem InvoiceItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: OrderItem OrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id);


--
-- Name: OrderRequestLog OrderRequestLog_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."OrderRequestLog"
    ADD CONSTRAINT "OrderRequestLog_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: ProductCatalog ProductCatalog_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ProductCatalog"
    ADD CONSTRAINT "ProductCatalog_pkey" PRIMARY KEY (id);


--
-- Name: RetailerAssignmentActive RetailerAssignmentActive_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentActive"
    ADD CONSTRAINT "RetailerAssignmentActive_pkey" PRIMARY KEY (id);


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_pkey" PRIMARY KEY (id);


--
-- Name: RetailerLedger RetailerLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerLedger"
    ADD CONSTRAINT "RetailerLedger_pkey" PRIMARY KEY (id);


--
-- Name: RetailerStockAuditItem RetailerStockAuditItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerStockAuditItem"
    ADD CONSTRAINT "RetailerStockAuditItem_pkey" PRIMARY KEY (id);


--
-- Name: RetailerStockAudit RetailerStockAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerStockAudit"
    ADD CONSTRAINT "RetailerStockAudit_pkey" PRIMARY KEY (id);


--
-- Name: RetailerStockBatch RetailerStockBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerStockBatch"
    ADD CONSTRAINT "RetailerStockBatch_pkey" PRIMARY KEY (id);


--
-- Name: RetailerStockSnapshot RetailerStockSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerStockSnapshot"
    ADD CONSTRAINT "RetailerStockSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: RetailerTransferBatchItem RetailerTransferBatchItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerTransferBatchItem"
    ADD CONSTRAINT "RetailerTransferBatchItem_pkey" PRIMARY KEY (id);


--
-- Name: RetailerTransferBatch RetailerTransferBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerTransferBatch"
    ADD CONSTRAINT "RetailerTransferBatch_pkey" PRIMARY KEY (id);


--
-- Name: Retailer Retailer_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Retailer"
    ADD CONSTRAINT "Retailer_pkey" PRIMARY KEY (id);


--
-- Name: RewardCatalog RewardCatalog_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RewardCatalog"
    ADD CONSTRAINT "RewardCatalog_pkey" PRIMARY KEY (id);


--
-- Name: RewardRedeemRequest RewardRedeemRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RewardRedeemRequest"
    ADD CONSTRAINT "RewardRedeemRequest_pkey" PRIMARY KEY (id);


--
-- Name: SalesManagerDailyClose SalesManagerDailyClose_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SalesManagerDailyClose"
    ADD CONSTRAINT "SalesManagerDailyClose_pkey" PRIMARY KEY (id);


--
-- Name: SalesManagerTaskRemark SalesManagerTaskRemark_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SalesManagerTaskRemark"
    ADD CONSTRAINT "SalesManagerTaskRemark_pkey" PRIMARY KEY (id);


--
-- Name: SalesManagerTask SalesManagerTask_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SalesManagerTask"
    ADD CONSTRAINT "SalesManagerTask_pkey" PRIMARY KEY (id);


--
-- Name: SalesTarget SalesTarget_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SalesTarget"
    ADD CONSTRAINT "SalesTarget_pkey" PRIMARY KEY (id);


--
-- Name: StockAuditLine StockAuditLine_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockAuditLine"
    ADD CONSTRAINT "StockAuditLine_pkey" PRIMARY KEY (id);


--
-- Name: StockAuditTask StockAuditTask_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockAuditTask"
    ADD CONSTRAINT "StockAuditTask_pkey" PRIMARY KEY (id);


--
-- Name: StockAudit StockAudit_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockAudit"
    ADD CONSTRAINT "StockAudit_pkey" PRIMARY KEY (id);


--
-- Name: StockLot StockLot_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockLot"
    ADD CONSTRAINT "StockLot_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: DistributorProductRate_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DistributorProductRate_distributorId_idx" ON public."DistributorProductRate" USING btree ("distributorId");


--
-- Name: DistributorProductRate_distributorId_productName_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "DistributorProductRate_distributorId_productName_key" ON public."DistributorProductRate" USING btree ("distributorId", "productName");


--
-- Name: DistributorProductRate_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DistributorProductRate_productName_idx" ON public."DistributorProductRate" USING btree ("productName");


--
-- Name: Distributor_code_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Distributor_code_key" ON public."Distributor" USING btree (code);


--
-- Name: Distributor_defaultFoUserId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Distributor_defaultFoUserId_idx" ON public."Distributor" USING btree ("defaultFoUserId");


--
-- Name: Distributor_gst_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Distributor_gst_key" ON public."Distributor" USING btree (gst);


--
-- Name: Distributor_phone_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Distributor_phone_key" ON public."Distributor" USING btree (phone);


--
-- Name: Distributor_salesManagerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Distributor_salesManagerId_idx" ON public."Distributor" USING btree ("salesManagerId");


--
-- Name: Distributor_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Distributor_status_idx" ON public."Distributor" USING btree (status);


--
-- Name: Distributor_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Distributor_userId_key" ON public."Distributor" USING btree ("userId");


--
-- Name: FieldOfficerRetailerMap_distributorId_isActive_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "FieldOfficerRetailerMap_distributorId_isActive_idx" ON public."FieldOfficerRetailerMap" USING btree ("distributorId", "isActive");


--
-- Name: FieldOfficerRetailerMap_foUserId_isActive_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "FieldOfficerRetailerMap_foUserId_isActive_idx" ON public."FieldOfficerRetailerMap" USING btree ("foUserId", "isActive");


--
-- Name: FieldOfficerRetailerMap_retailerId_isActive_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "FieldOfficerRetailerMap_retailerId_isActive_idx" ON public."FieldOfficerRetailerMap" USING btree ("retailerId", "isActive");


--
-- Name: FieldOfficerRetailerMap_retailerId_isActive_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "FieldOfficerRetailerMap_retailerId_isActive_key" ON public."FieldOfficerRetailerMap" USING btree ("retailerId", "isActive");


--
-- Name: FieldOfficerTarget_foUserId_monthKey_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "FieldOfficerTarget_foUserId_monthKey_idx" ON public."FieldOfficerTarget" USING btree ("foUserId", "monthKey");


--
-- Name: FieldOfficerTarget_foUserId_monthKey_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "FieldOfficerTarget_foUserId_monthKey_key" ON public."FieldOfficerTarget" USING btree ("foUserId", "monthKey");


--
-- Name: FoMonthlyTarget_foUserId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "FoMonthlyTarget_foUserId_idx" ON public."FoMonthlyTarget" USING btree ("foUserId");


--
-- Name: FoMonthlyTarget_foUserId_monthKey_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "FoMonthlyTarget_foUserId_monthKey_key" ON public."FoMonthlyTarget" USING btree ("foUserId", "monthKey");


--
-- Name: FoMonthlyTarget_monthKey_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "FoMonthlyTarget_monthKey_idx" ON public."FoMonthlyTarget" USING btree ("monthKey");


--
-- Name: FoPointsLedger_foUserId_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "FoPointsLedger_foUserId_date_idx" ON public."FoPointsLedger" USING btree ("foUserId", date);


--
-- Name: FoPointsLedger_refType_refId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "FoPointsLedger_refType_refId_idx" ON public."FoPointsLedger" USING btree ("refType", "refId");


--
-- Name: InboundDispatchItem_inboundDispatchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundDispatchItem_inboundDispatchId_idx" ON public."InboundDispatchItem" USING btree ("inboundDispatchId");


--
-- Name: InboundDispatchItem_inboundOrderItemId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundDispatchItem_inboundOrderItemId_idx" ON public."InboundDispatchItem" USING btree ("inboundOrderItemId");


--
-- Name: InboundDispatch_inboundOrderId_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundDispatch_inboundOrderId_createdAt_idx" ON public."InboundDispatch" USING btree ("inboundOrderId", "createdAt");


--
-- Name: InboundDispatch_trackingNo_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundDispatch_trackingNo_idx" ON public."InboundDispatch" USING btree ("trackingNo");


--
-- Name: InboundOrderItem_inboundOrderId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundOrderItem_inboundOrderId_idx" ON public."InboundOrderItem" USING btree ("inboundOrderId");


--
-- Name: InboundOrderItem_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundOrderItem_productName_idx" ON public."InboundOrderItem" USING btree ("productName");


--
-- Name: InboundOrder_createdByUserId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundOrder_createdByUserId_idx" ON public."InboundOrder" USING btree ("createdByUserId");


--
-- Name: InboundOrder_forDistributorId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundOrder_forDistributorId_status_createdAt_idx" ON public."InboundOrder" USING btree ("forDistributorId", status, "createdAt");


--
-- Name: InboundOrder_orderNo_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "InboundOrder_orderNo_key" ON public."InboundOrder" USING btree ("orderNo");


--
-- Name: InboundOrder_paymentStatus_paymentVerified_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundOrder_paymentStatus_paymentVerified_idx" ON public."InboundOrder" USING btree ("paymentStatus", "paymentVerified");


--
-- Name: InboundReceiveItem_inboundReceiveId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundReceiveItem_inboundReceiveId_idx" ON public."InboundReceiveItem" USING btree ("inboundReceiveId");


--
-- Name: InboundReceiveItem_inboundReceiveId_productName_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "InboundReceiveItem_inboundReceiveId_productName_key" ON public."InboundReceiveItem" USING btree ("inboundReceiveId", "productName");


--
-- Name: InboundReceiveItem_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundReceiveItem_productName_idx" ON public."InboundReceiveItem" USING btree ("productName");


--
-- Name: InboundReceive_distributorId_receivedAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundReceive_distributorId_receivedAt_idx" ON public."InboundReceive" USING btree ("distributorId", "receivedAt");


--
-- Name: InboundReceive_inboundOrderId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InboundReceive_inboundOrderId_idx" ON public."InboundReceive" USING btree ("inboundOrderId");


--
-- Name: InventoryAdjustmentTxn_refType_refId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryAdjustmentTxn_refType_refId_idx" ON public."InventoryAdjustmentTxn" USING btree ("refType", "refId");


--
-- Name: InventoryAdjustmentTxn_warehouseId_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryAdjustmentTxn_warehouseId_createdAt_idx" ON public."InventoryAdjustmentTxn" USING btree ("warehouseId", "createdAt");


--
-- Name: InventoryBatch_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryBatch_distributorId_idx" ON public."InventoryBatch" USING btree ("distributorId");


--
-- Name: InventoryBatch_distributorId_productName_batchNo_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "InventoryBatch_distributorId_productName_batchNo_key" ON public."InventoryBatch" USING btree ("distributorId", "productName", "batchNo");


--
-- Name: InventoryBatch_expiryDate_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryBatch_expiryDate_idx" ON public."InventoryBatch" USING btree ("expiryDate");


--
-- Name: InventorySnapshot_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventorySnapshot_distributorId_idx" ON public."InventorySnapshot" USING btree ("distributorId");


--
-- Name: InventorySnapshot_distributorId_productName_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "InventorySnapshot_distributorId_productName_key" ON public."InventorySnapshot" USING btree ("distributorId", "productName");


--
-- Name: InventorySnapshot_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventorySnapshot_productName_idx" ON public."InventorySnapshot" USING btree ("productName");


--
-- Name: InventoryTxnBatchMap_batchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryTxnBatchMap_batchId_idx" ON public."InventoryTxnBatchMap" USING btree ("batchId");


--
-- Name: InventoryTxnBatchMap_txnId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryTxnBatchMap_txnId_idx" ON public."InventoryTxnBatchMap" USING btree ("txnId");


--
-- Name: InventoryTxn_distributorId_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryTxn_distributorId_createdAt_idx" ON public."InventoryTxn" USING btree ("distributorId", "createdAt");


--
-- Name: InventoryTxn_productName_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryTxn_productName_createdAt_idx" ON public."InventoryTxn" USING btree ("productName", "createdAt");


--
-- Name: InventoryTxn_refType_refId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InventoryTxn_refType_refId_idx" ON public."InventoryTxn" USING btree ("refType", "refId");


--
-- Name: Inventory_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Inventory_distributorId_idx" ON public."Inventory" USING btree ("distributorId");


--
-- Name: Inventory_distributorId_productName_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Inventory_distributorId_productName_key" ON public."Inventory" USING btree ("distributorId", "productName");


--
-- Name: InvoiceItem_invoiceId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InvoiceItem_invoiceId_idx" ON public."InvoiceItem" USING btree ("invoiceId");


--
-- Name: InvoiceItem_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "InvoiceItem_productName_idx" ON public."InvoiceItem" USING btree ("productName");


--
-- Name: Invoice_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Invoice_distributorId_idx" ON public."Invoice" USING btree ("distributorId");


--
-- Name: Invoice_invoiceNo_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Invoice_invoiceNo_key" ON public."Invoice" USING btree ("invoiceNo");


--
-- Name: Invoice_invoiceType_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Invoice_invoiceType_idx" ON public."Invoice" USING btree ("invoiceType");


--
-- Name: Invoice_orderId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Invoice_orderId_key" ON public."Invoice" USING btree ("orderId");


--
-- Name: Invoice_retailerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Invoice_retailerId_idx" ON public."Invoice" USING btree ("retailerId");


--
-- Name: OrderItem_orderId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "OrderItem_orderId_idx" ON public."OrderItem" USING btree ("orderId");


--
-- Name: OrderItem_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "OrderItem_productName_idx" ON public."OrderItem" USING btree ("productName");


--
-- Name: OrderRequestLog_idempotencyKey_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "OrderRequestLog_idempotencyKey_key" ON public."OrderRequestLog" USING btree ("idempotencyKey");


--
-- Name: Order_clientRequestHash_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Order_clientRequestHash_idx" ON public."Order" USING btree ("clientRequestHash");


--
-- Name: Order_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Order_distributorId_idx" ON public."Order" USING btree ("distributorId");


--
-- Name: Order_idempotencyKey_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Order_idempotencyKey_idx" ON public."Order" USING btree ("idempotencyKey");


--
-- Name: Order_idempotencyKey_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON public."Order" USING btree ("idempotencyKey");


--
-- Name: Order_orderNo_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Order_orderNo_key" ON public."Order" USING btree ("orderNo");


--
-- Name: Order_retailerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Order_retailerId_idx" ON public."Order" USING btree ("retailerId");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: ProductCatalog_barcode_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ProductCatalog_barcode_key" ON public."ProductCatalog" USING btree (barcode);


--
-- Name: ProductCatalog_isActive_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ProductCatalog_isActive_idx" ON public."ProductCatalog" USING btree ("isActive");


--
-- Name: ProductCatalog_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ProductCatalog_name_idx" ON public."ProductCatalog" USING btree (name);


--
-- Name: ProductCatalog_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ProductCatalog_name_key" ON public."ProductCatalog" USING btree (name);


--
-- Name: RetailerAssignmentActive_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerAssignmentActive_distributorId_idx" ON public."RetailerAssignmentActive" USING btree ("distributorId");


--
-- Name: RetailerAssignmentActive_foUserId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerAssignmentActive_foUserId_idx" ON public."RetailerAssignmentActive" USING btree ("foUserId");


--
-- Name: RetailerAssignmentActive_retailerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "RetailerAssignmentActive_retailerId_key" ON public."RetailerAssignmentActive" USING btree ("retailerId");


--
-- Name: RetailerAssignmentHistory_actorUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerAssignmentHistory_actorUserId_createdAt_idx" ON public."RetailerAssignmentHistory" USING btree ("actorUserId", "createdAt");


--
-- Name: RetailerAssignmentHistory_distributorId_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerAssignmentHistory_distributorId_createdAt_idx" ON public."RetailerAssignmentHistory" USING btree ("distributorId", "createdAt");


--
-- Name: RetailerAssignmentHistory_retailerId_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerAssignmentHistory_retailerId_createdAt_idx" ON public."RetailerAssignmentHistory" USING btree ("retailerId", "createdAt");


--
-- Name: RetailerLedger_distributorId_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerLedger_distributorId_date_idx" ON public."RetailerLedger" USING btree ("distributorId", date);


--
-- Name: RetailerLedger_retailerId_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerLedger_retailerId_date_idx" ON public."RetailerLedger" USING btree ("retailerId", date);


--
-- Name: RetailerLedger_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerLedger_type_idx" ON public."RetailerLedger" USING btree (type);


--
-- Name: RetailerStockAuditItem_auditId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerStockAuditItem_auditId_idx" ON public."RetailerStockAuditItem" USING btree ("auditId");


--
-- Name: RetailerStockAuditItem_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerStockAuditItem_productName_idx" ON public."RetailerStockAuditItem" USING btree ("productName");


--
-- Name: RetailerStockAudit_distributorId_retailerId_auditDate_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerStockAudit_distributorId_retailerId_auditDate_idx" ON public."RetailerStockAudit" USING btree ("distributorId", "retailerId", "auditDate");


--
-- Name: RetailerStockAudit_fieldOfficerId_auditDate_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerStockAudit_fieldOfficerId_auditDate_idx" ON public."RetailerStockAudit" USING btree ("fieldOfficerId", "auditDate");


--
-- Name: RetailerStockBatch_expiryDate_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerStockBatch_expiryDate_idx" ON public."RetailerStockBatch" USING btree ("expiryDate");


--
-- Name: RetailerStockBatch_retailerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerStockBatch_retailerId_idx" ON public."RetailerStockBatch" USING btree ("retailerId");


--
-- Name: RetailerStockBatch_retailerId_productName_batchNo_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "RetailerStockBatch_retailerId_productName_batchNo_key" ON public."RetailerStockBatch" USING btree ("retailerId", "productName", "batchNo");


--
-- Name: RetailerStockSnapshot_distributorId_retailerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerStockSnapshot_distributorId_retailerId_idx" ON public."RetailerStockSnapshot" USING btree ("distributorId", "retailerId");


--
-- Name: RetailerStockSnapshot_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RetailerStockSnapshot_productName_idx" ON public."RetailerStockSnapshot" USING btree ("productName");


--
-- Name: RetailerTransferBatchItem_batchId_retailerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "RetailerTransferBatchItem_batchId_retailerId_key" ON public."RetailerTransferBatchItem" USING btree ("batchId", "retailerId");


--
-- Name: Retailer_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Retailer_distributorId_idx" ON public."Retailer" USING btree ("distributorId");


--
-- Name: Retailer_phone_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Retailer_phone_key" ON public."Retailer" USING btree (phone);


--
-- Name: Retailer_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Retailer_status_idx" ON public."Retailer" USING btree (status);


--
-- Name: Retailer_userId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Retailer_userId_key" ON public."Retailer" USING btree ("userId");


--
-- Name: RewardCatalog_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RewardCatalog_active_idx" ON public."RewardCatalog" USING btree (active);


--
-- Name: RewardRedeemRequest_foUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RewardRedeemRequest_foUserId_createdAt_idx" ON public."RewardRedeemRequest" USING btree ("foUserId", "createdAt");


--
-- Name: RewardRedeemRequest_rewardId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RewardRedeemRequest_rewardId_idx" ON public."RewardRedeemRequest" USING btree ("rewardId");


--
-- Name: RewardRedeemRequest_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "RewardRedeemRequest_status_idx" ON public."RewardRedeemRequest" USING btree (status);


--
-- Name: SalesManagerDailyClose_salesManagerId_day_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "SalesManagerDailyClose_salesManagerId_day_idx" ON public."SalesManagerDailyClose" USING btree ("salesManagerId", day);


--
-- Name: SalesManagerDailyClose_salesManagerId_day_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "SalesManagerDailyClose_salesManagerId_day_key" ON public."SalesManagerDailyClose" USING btree ("salesManagerId", day);


--
-- Name: SalesManagerTaskRemark_taskId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "SalesManagerTaskRemark_taskId_idx" ON public."SalesManagerTaskRemark" USING btree ("taskId");


--
-- Name: SalesManagerTask_salesManagerId_day_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "SalesManagerTask_salesManagerId_day_idx" ON public."SalesManagerTask" USING btree ("salesManagerId", day);


--
-- Name: SalesManagerTask_salesManagerId_day_title_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "SalesManagerTask_salesManagerId_day_title_key" ON public."SalesManagerTask" USING btree ("salesManagerId", day, title);


--
-- Name: SalesManagerTask_salesManagerId_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "SalesManagerTask_salesManagerId_status_idx" ON public."SalesManagerTask" USING btree ("salesManagerId", status);


--
-- Name: SalesTarget_month_fieldOfficerId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "SalesTarget_month_fieldOfficerId_key" ON public."SalesTarget" USING btree (month, "fieldOfficerId");


--
-- Name: StockAuditLine_auditId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockAuditLine_auditId_idx" ON public."StockAuditLine" USING btree ("auditId");


--
-- Name: StockAuditLine_mismatchType_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockAuditLine_mismatchType_idx" ON public."StockAuditLine" USING btree ("mismatchType");


--
-- Name: StockAuditLine_needsInvestigation_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockAuditLine_needsInvestigation_idx" ON public."StockAuditLine" USING btree ("needsInvestigation");


--
-- Name: StockAuditLine_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockAuditLine_productName_idx" ON public."StockAuditLine" USING btree ("productName");


--
-- Name: StockAuditTask_auditId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockAuditTask_auditId_idx" ON public."StockAuditTask" USING btree ("auditId");


--
-- Name: StockAuditTask_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockAuditTask_status_idx" ON public."StockAuditTask" USING btree (status);


--
-- Name: StockAudit_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockAudit_status_idx" ON public."StockAudit" USING btree (status);


--
-- Name: StockAudit_warehouseId_auditDate_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockAudit_warehouseId_auditDate_idx" ON public."StockAudit" USING btree ("warehouseId", "auditDate");


--
-- Name: StockAudit_warehouseId_monthKey_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "StockAudit_warehouseId_monthKey_key" ON public."StockAudit" USING btree ("warehouseId", "monthKey");


--
-- Name: StockLot_expDate_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockLot_expDate_idx" ON public."StockLot" USING btree ("expDate");


--
-- Name: StockLot_ownerType_ownerId_productName_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockLot_ownerType_ownerId_productName_idx" ON public."StockLot" USING btree ("ownerType", "ownerId", "productName");


--
-- Name: User_code_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_code_key" ON public."User" USING btree (code);


--
-- Name: User_distributorId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "User_distributorId_idx" ON public."User" USING btree ("distributorId");


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: Distributor Distributor_defaultFoUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Distributor"
    ADD CONSTRAINT "Distributor_defaultFoUserId_fkey" FOREIGN KEY ("defaultFoUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Distributor Distributor_salesManagerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Distributor"
    ADD CONSTRAINT "Distributor_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Distributor Distributor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Distributor"
    ADD CONSTRAINT "Distributor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldOfficerRetailerMap FieldOfficerRetailerMap_assignedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FieldOfficerRetailerMap"
    ADD CONSTRAINT "FieldOfficerRetailerMap_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldOfficerRetailerMap FieldOfficerRetailerMap_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FieldOfficerRetailerMap"
    ADD CONSTRAINT "FieldOfficerRetailerMap_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FieldOfficerRetailerMap FieldOfficerRetailerMap_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FieldOfficerRetailerMap"
    ADD CONSTRAINT "FieldOfficerRetailerMap_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FoMonthlyTarget FoMonthlyTarget_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FoMonthlyTarget"
    ADD CONSTRAINT "FoMonthlyTarget_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FoPointsLedger FoPointsLedger_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."FoPointsLedger"
    ADD CONSTRAINT "FoPointsLedger_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundDispatchItem InboundDispatchItem_inboundDispatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundDispatchItem"
    ADD CONSTRAINT "InboundDispatchItem_inboundDispatchId_fkey" FOREIGN KEY ("inboundDispatchId") REFERENCES public."InboundDispatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundDispatch InboundDispatch_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundDispatch"
    ADD CONSTRAINT "InboundDispatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundDispatch InboundDispatch_inboundOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundDispatch"
    ADD CONSTRAINT "InboundDispatch_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES public."InboundOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundOrderItem InboundOrderItem_inboundOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundOrderItem"
    ADD CONSTRAINT "InboundOrderItem_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES public."InboundOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundOrder InboundOrder_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InboundOrder InboundOrder_dispatchedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_dispatchedByUserId_fkey" FOREIGN KEY ("dispatchedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundOrder InboundOrder_forDistributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_forDistributorId_fkey" FOREIGN KEY ("forDistributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InboundOrder InboundOrder_paymentEnteredByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_paymentEnteredByUserId_fkey" FOREIGN KEY ("paymentEnteredByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundOrder InboundOrder_paymentVerifiedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundOrder"
    ADD CONSTRAINT "InboundOrder_paymentVerifiedByUserId_fkey" FOREIGN KEY ("paymentVerifiedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InboundReceiveItem InboundReceiveItem_inboundReceiveId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundReceiveItem"
    ADD CONSTRAINT "InboundReceiveItem_inboundReceiveId_fkey" FOREIGN KEY ("inboundReceiveId") REFERENCES public."InboundReceive"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundReceive InboundReceive_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundReceive"
    ADD CONSTRAINT "InboundReceive_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InboundReceive InboundReceive_inboundOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundReceive"
    ADD CONSTRAINT "InboundReceive_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES public."InboundOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InboundReceive InboundReceive_receivedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InboundReceive"
    ADD CONSTRAINT "InboundReceive_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryTxnBatchMap InventoryTxnBatchMap_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InventoryTxnBatchMap"
    ADD CONSTRAINT "InventoryTxnBatchMap_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."InventoryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryTxnBatchMap InventoryTxnBatchMap_txnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InventoryTxnBatchMap"
    ADD CONSTRAINT "InventoryTxnBatchMap_txnId_fkey" FOREIGN KEY ("txnId") REFERENCES public."InventoryTxn"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoiceItem InvoiceItem_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Invoice Invoice_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderItem OrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."OrderItem"
    ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RetailerAssignmentActive RetailerAssignmentActive_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentActive"
    ADD CONSTRAINT "RetailerAssignmentActive_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerAssignmentActive RetailerAssignmentActive_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentActive"
    ADD CONSTRAINT "RetailerAssignmentActive_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerAssignmentActive RetailerAssignmentActive_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentActive"
    ADD CONSTRAINT "RetailerAssignmentActive_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_fromFoUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_fromFoUserId_fkey" FOREIGN KEY ("fromFoUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerAssignmentHistory RetailerAssignmentHistory_toFoUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerAssignmentHistory"
    ADD CONSTRAINT "RetailerAssignmentHistory_toFoUserId_fkey" FOREIGN KEY ("toFoUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RetailerLedger RetailerLedger_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerLedger"
    ADD CONSTRAINT "RetailerLedger_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerLedger RetailerLedger_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerLedger"
    ADD CONSTRAINT "RetailerLedger_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerStockAuditItem RetailerStockAuditItem_auditId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerStockAuditItem"
    ADD CONSTRAINT "RetailerStockAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES public."RetailerStockAudit"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerStockAudit RetailerStockAudit_fieldOfficerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerStockAudit"
    ADD CONSTRAINT "RetailerStockAudit_fieldOfficerId_fkey" FOREIGN KEY ("fieldOfficerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerStockAudit RetailerStockAudit_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerStockAudit"
    ADD CONSTRAINT "RetailerStockAudit_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RetailerStockSnapshot RetailerStockSnapshot_retailerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerStockSnapshot"
    ADD CONSTRAINT "RetailerStockSnapshot_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES public."Retailer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RetailerTransferBatchItem RetailerTransferBatchItem_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerTransferBatchItem"
    ADD CONSTRAINT "RetailerTransferBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."RetailerTransferBatch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RetailerTransferBatch RetailerTransferBatch_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerTransferBatch"
    ADD CONSTRAINT "RetailerTransferBatch_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RetailerTransferBatch RetailerTransferBatch_fromFoUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerTransferBatch"
    ADD CONSTRAINT "RetailerTransferBatch_fromFoUserId_fkey" FOREIGN KEY ("fromFoUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RetailerTransferBatch RetailerTransferBatch_toFoUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RetailerTransferBatch"
    ADD CONSTRAINT "RetailerTransferBatch_toFoUserId_fkey" FOREIGN KEY ("toFoUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Retailer Retailer_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Retailer"
    ADD CONSTRAINT "Retailer_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Retailer Retailer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Retailer"
    ADD CONSTRAINT "Retailer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RewardRedeemRequest RewardRedeemRequest_foUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RewardRedeemRequest"
    ADD CONSTRAINT "RewardRedeemRequest_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RewardRedeemRequest RewardRedeemRequest_rewardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."RewardRedeemRequest"
    ADD CONSTRAINT "RewardRedeemRequest_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES public."RewardCatalog"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SalesManagerDailyClose SalesManagerDailyClose_salesManagerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SalesManagerDailyClose"
    ADD CONSTRAINT "SalesManagerDailyClose_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalesManagerTaskRemark SalesManagerTaskRemark_taskId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SalesManagerTaskRemark"
    ADD CONSTRAINT "SalesManagerTaskRemark_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES public."SalesManagerTask"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalesManagerTask SalesManagerTask_salesManagerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SalesManagerTask"
    ADD CONSTRAINT "SalesManagerTask_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockAuditLine StockAuditLine_auditId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockAuditLine"
    ADD CONSTRAINT "StockAuditLine_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES public."StockAudit"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockAuditTask StockAuditTask_auditId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockAuditTask"
    ADD CONSTRAINT "StockAuditTask_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES public."StockAudit"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_distributorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES public."Distributor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict 3Ddxf9HOB4NqmtH4SQtg0vLZHfZoIzqVotCaAqTQe7eoFu3yYm8rfqvROeuJaXd

