-- =============================================================================
-- PCRM - Esquema base
-- PostgreSQL / Supabase (PostGIS)
--
-- Convenciones:
--   * Nombres de tablas y columnas en ingles, traduccion literal del DER.
--   * created_at / updated_at / deleted_at donde aplica.
--     - deleted_at NULL  = registro vigente
--     - deleted_at NOT NULL = borrado logico (soft delete)
--   * En 3 tablas el created_at conserva su nombre descriptivo:
--       upload.uploaded_at, balance_snapshot.captured_at, product_request.requested_at
--   * updated_at lo mantiene la aplicacion (no hay triggers en este script).
--   * Los UNIQUE son indices unicos parciales (WHERE deleted_at IS NULL) para
--     permitir volver a dar de alta un codigo que fue borrado logicamente.
-- =============================================================================

create extension if not exists postgis with schema extensions;

-- =============================================================================
-- 1. CATALOGOS Y ENTIDADES BASE
-- =============================================================================

-- usuario -> app_user  ("user" es palabra reservada en SQL)
create table public.app_user (
    id              uuid primary key default gen_random_uuid(),
    erp_user_id     integer,
    clerk_user_id   text,
    role            text        not null,
    name            text        not null,
    email           text,
    active          boolean     not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz
);

create unique index app_user_erp_user_id_key
    on public.app_user (erp_user_id) where deleted_at is null;
create unique index app_user_clerk_user_id_key
    on public.app_user (clerk_user_id) where deleted_at is null;


-- cliente -> customer
create table public.customer (
    id                  uuid primary key default gen_random_uuid(),
    erp_customer_id     integer,
    personality         text,
    potential           text,
    name                text        not null,
    trade_name          text,
    establishment_type  text,
    address             text,
    municipality        text,
    zone                text,
    phone               text,
    mobile              text,
    location            extensions.geography(Point, 4326),
    place_id            text,
    attends             text,
    credit              boolean     not null default false,
    credit_limit        numeric(14,2),
    origin              text,
    active              boolean     not null default true,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    deleted_at          timestamptz
);

create unique index customer_erp_customer_id_key
    on public.customer (erp_customer_id) where deleted_at is null;
create index customer_location_idx
    on public.customer using gist (location) where deleted_at is null;
create index customer_active_idx
    on public.customer (active) where deleted_at is null;


-- prospecto -> prospect
create table public.prospect (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid        not null references public.app_user (id),
    name        text        not null,
    trade_name  text,
    address     text,
    phone       text,
    location    extensions.geography(Point, 4326),
    status      text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    deleted_at  timestamptz
);

create index prospect_user_id_idx on public.prospect (user_id) where deleted_at is null;
create index prospect_location_idx on public.prospect using gist (location) where deleted_at is null;


-- producto -> product  (PK natural del ERP)
create table public.product (
    erp_product_id  integer primary key,
    code            text,
    name            text        not null,
    product_group   text,                       -- "group" es palabra reservada
    last_seen_at    timestamptz,                -- antes visto_en
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz
);

create index product_code_idx on public.product (code) where deleted_at is null;


-- producto_cotizado -> quoted_product
create table public.quoted_product (
    id          uuid primary key default gen_random_uuid(),
    name        text        not null,
    code        text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    deleted_at  timestamptz
);


-- =============================================================================
-- 2. RUTAS Y PLANEACION
-- =============================================================================

-- ruta -> route
create table public.route (
    id            uuid primary key default gen_random_uuid(),
    name          text        not null,
    municipality  text,
    zone          text,
    active        boolean     not null default true,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),
    deleted_at    timestamptz
);


-- ruta_cliente -> route_customer  (planeacion: que clientes componen la ruta)
create table public.route_customer (
    id          uuid primary key default gen_random_uuid(),
    route_id    uuid        not null references public.route (id),
    customer_id uuid        not null references public.customer (id),
    sort_order  smallint,                       -- antes orden ("order" es reservada)
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    deleted_at  timestamptz
);

create unique index route_customer_unique_key
    on public.route_customer (route_id, customer_id) where deleted_at is null;
create index route_customer_customer_id_idx
    on public.route_customer (customer_id) where deleted_at is null;


-- ruta_usuario -> route_user  (asignacion vendedor / ruta / dia)
create table public.route_user (
    id          uuid primary key default gen_random_uuid(),
    route_id    uuid        not null references public.route (id),
    user_id     uuid        not null references public.app_user (id),
    day         smallint    check (day between 1 and 7),
    status      text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    deleted_at  timestamptz
);

create unique index route_user_unique_key
    on public.route_user (route_id, user_id, day) where deleted_at is null;
create index route_user_user_id_idx
    on public.route_user (user_id) where deleted_at is null;


-- visita_programada -> scheduled_visit
create table public.scheduled_visit (
    id             uuid primary key default gen_random_uuid(),
    route_user_id  uuid        not null references public.route_user (id),
    visit_date     date        not null,        -- antes fecha
    customer_id    uuid        references public.customer (id),
    prospect_id    uuid        references public.prospect (id),
    stop_type      text        not null default 'visit',
    reason         text,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    deleted_at     timestamptz,

    -- una parada apunta a un cliente O a un prospecto, no a ambos ni a ninguno
    constraint scheduled_visit_target_chk
        check (num_nonnulls(customer_id, prospect_id) = 1)
);

create index scheduled_visit_date_idx
    on public.scheduled_visit (visit_date) where deleted_at is null;
create index scheduled_visit_route_user_idx
    on public.scheduled_visit (route_user_id) where deleted_at is null;


-- =============================================================================
-- 3. EJECUCION EN CAMPO
-- =============================================================================

-- visita -> visit
create table public.visit (
    id                 uuid primary key default gen_random_uuid(),
    customer_id        uuid        not null references public.customer (id),
    user_id            uuid        not null references public.app_user (id),
    route_user_id      uuid        references public.route_user (id),
    route_customer_id  uuid        references public.route_customer (id),
    started_at         timestamptz,             -- antes iniciada_en (dato de negocio)
    finished_at        timestamptz,             -- antes finalizada_en (dato de negocio)
    checkin_location   extensions.geography(Point, 4326),
    distance_meters    numeric(8,2),
    visit_type         text,
    successful         boolean,
    no_order_reason    text,
    notes              text,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now(),
    deleted_at         timestamptz
);

create index visit_customer_id_idx on public.visit (customer_id) where deleted_at is null;
create index visit_user_id_idx     on public.visit (user_id) where deleted_at is null;
create index visit_started_at_idx  on public.visit (started_at) where deleted_at is null;


-- solicitud_producto -> product_request
-- requested_at cumple la funcion de created_at (nombre descriptivo)
create table public.product_request (
    id                  uuid primary key default gen_random_uuid(),
    visit_id            uuid        references public.visit (id),
    customer_id         uuid        references public.customer (id),
    user_id             uuid        references public.app_user (id),
    quoted_product_id   uuid        references public.quoted_product (id),
    requested_quantity  numeric(12,3),
    requested_at        timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    deleted_at          timestamptz
);

create index product_request_visit_id_idx
    on public.product_request (visit_id) where deleted_at is null;


-- meta -> goal
create table public.goal (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid        not null references public.app_user (id),
    year         smallint    not null,
    month        smallint    not null check (month between 1 and 12),
    goal_amount  numeric(14,2) not null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    deleted_at   timestamptz
);

create unique index goal_unique_key
    on public.goal (user_id, year, month) where deleted_at is null;


-- =============================================================================
-- 4. IMPORTACION DESDE EL ERP
-- =============================================================================

-- carga -> upload
-- uploaded_at cumple la funcion de created_at (nombre descriptivo)
create table public.upload (
    id              uuid primary key default gen_random_uuid(),
    uploaded_by     uuid        references public.app_user (id),
    range_from      date,
    range_to        date,
    sales_received  integer     not null default 0,
    inserted        integer     not null default 0,
    updated         integer     not null default 0,
    failed          integer     not null default 0,
    status          text        not null default 'pending',
    uploaded_at     timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index upload_uploaded_at_idx on public.upload (uploaded_at desc);


-- venta -> sale  (PK natural del ERP)
create table public.sale (
    erp_sale_id      integer primary key,
    customer_id      uuid        references public.customer (id),
    upload_id        uuid        references public.upload (id),
    user_id          uuid        references public.app_user (id),
    visit_id         uuid        references public.visit (id),
    erp_created_at   timestamptz,               -- antes fecha_creacion (fecha del ERP)
    last_payment_at  timestamptz,               -- antes ultimo_pago_en
    total            numeric(14,2),
    net_total        numeric(14,2),
    vat              numeric(14,2),
    pending_balance  numeric(14,2),             -- antes saldop
    payment          text,
    payment_id       smallint,
    erp_status       smallint,
    document         text,
    remarks          text,
    absent           boolean     not null default false,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    deleted_at       timestamptz                -- venta anulada o desaparecida del ERP
);

create index sale_customer_id_idx    on public.sale (customer_id) where deleted_at is null;
create index sale_visit_id_idx       on public.sale (visit_id) where deleted_at is null;
create index sale_erp_created_at_idx on public.sale (erp_created_at) where deleted_at is null;
create index sale_upload_id_idx      on public.sale (upload_id);


-- venta_detalle -> sale_detail  (sin deleted_at: vive y muere con su venta)
create table public.sale_detail (
    sale_detail_id   integer primary key,
    erp_sale_id      integer     not null references public.sale (erp_sale_id) on delete cascade,
    product_id       integer     references public.product (erp_product_id),
    quantity         numeric(12,4),
    unit_of_measure  text,                      -- antes um
    factor           numeric(10,2),
    price            numeric(14,4),
    total            numeric(14,2),
    tax_total        numeric(14,4),             -- antes total_imp
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index sale_detail_erp_sale_id_idx on public.sale_detail (erp_sale_id);
create index sale_detail_product_id_idx  on public.sale_detail (product_id);


-- venta_staging -> sale_staging  (tabla de proceso: solo created_at)
create table public.sale_staging (
    id            bigserial primary key,
    upload_id     uuid        not null references public.upload (id) on delete cascade,
    erp_sale_id   integer,
    payload       jsonb       not null,
    status        text        not null default 'pending',
    error         text,
    processed_at  timestamptz,                  -- antes procesado_en (cuando se proceso)
    created_at    timestamptz not null default now()
);

create index sale_staging_upload_status_idx on public.sale_staging (upload_id, status);


-- saldo_snapshot -> balance_snapshot  (historico inmutable)
-- captured_at cumple la funcion de created_at (nombre descriptivo)
create table public.balance_snapshot (
    id               bigserial primary key,
    upload_id        uuid        references public.upload (id),
    erp_sale_id      integer     references public.sale (erp_sale_id),
    pending_balance  numeric(14,2),             -- antes saldop
    payment          text,
    captured_at      timestamptz not null default now()
);

create index balance_snapshot_sale_idx on public.balance_snapshot (erp_sale_id, captured_at desc);


-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- Se habilita en todas las tablas. Sin politicas definidas todavia: mientras no
-- se creen, anon y authenticated no ven nada; solo service_role tiene acceso.
-- =============================================================================

alter table public.app_user         enable row level security;
alter table public.customer         enable row level security;
alter table public.prospect         enable row level security;
alter table public.product          enable row level security;
alter table public.quoted_product   enable row level security;
alter table public.route            enable row level security;
alter table public.route_customer   enable row level security;
alter table public.route_user       enable row level security;
alter table public.scheduled_visit  enable row level security;
alter table public.visit            enable row level security;
alter table public.product_request  enable row level security;
alter table public.goal             enable row level security;
alter table public.upload           enable row level security;
alter table public.sale             enable row level security;
alter table public.sale_detail      enable row level security;
alter table public.sale_staging     enable row level security;
alter table public.balance_snapshot enable row level security;
