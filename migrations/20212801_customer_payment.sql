--
-- CREATE NEW TABLE:
--   customer_payments
--
CREATE TABLE customer_payments (
    id bigint NOT NULL,
    reference character varying(45),
    "referenceId" character varying(255),
    amount integer NOT NULL,
    currency character varying(16) NOT NULL,
    "paymentIntentId" character varying(255) NOT NULL,
    "clientSecret" character varying(255),
    status character varying(64) NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    "createdBy" bigint NOT NULL,
    "updatedBy" bigint NOT NULL,
    "deletedAt" timestamp with time zone
);

CREATE SEQUENCE public.customer_payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE customer_payments_id_seq OWNED BY customer_payments.id;

ALTER TABLE ONLY customer_payments ALTER COLUMN id SET DEFAULT nextval('customer_payments_id_seq');

ALTER TABLE ONLY customer_payments
    ADD CONSTRAINT customer_payments_pkey PRIMARY KEY (id);
