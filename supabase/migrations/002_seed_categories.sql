-- =============================================================
-- CATEGORÍAS POR DEFECTO (sistema)
-- Se insertan por usuario en el trigger de signup
-- =============================================================

-- Función para crear las categorías iniciales de un usuario
CREATE OR REPLACE FUNCTION create_default_categories(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  -- IDs de categorías padre
  v_ingresos        UUID;
  v_vivienda        UUID;
  v_alimentacion    UUID;
  v_transporte      UUID;
  v_salud           UUID;
  v_entretenimiento UUID;
  v_educacion       UUID;
  v_cuidado         UUID;
  v_finanzas        UUID;
  v_servicios_fin   UUID;
  v_varios          UUID;
BEGIN
  -- ── INGRESOS ──────────────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Ingresos', 'income', '#22c55e', 'TrendingUp', TRUE, 1)
    RETURNING id INTO v_ingresos;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Salario / Nómina',          'income', v_ingresos, '#22c55e', 'Briefcase',     TRUE, 1),
    (p_user_id, 'Freelance / Consultoría',    'income', v_ingresos, '#22c55e', 'Code',          TRUE, 2),
    (p_user_id, 'Intereses / Rendimientos',   'income', v_ingresos, '#22c55e', 'Percent',       TRUE, 3),
    (p_user_id, 'Reembolsos',                 'income', v_ingresos, '#22c55e', 'RotateCcw',     TRUE, 4),
    (p_user_id, 'Otros ingresos',             'income', v_ingresos, '#22c55e', 'PlusCircle',    TRUE, 5);

  -- ── VIVIENDA ──────────────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Vivienda', 'expense', '#f97316', 'Home', TRUE, 2)
    RETURNING id INTO v_vivienda;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Alquiler / Hipoteca',      'expense', v_vivienda, '#f97316', 'Home',         TRUE, 1),
    (p_user_id, 'Electricidad (EDENORTE)',   'expense', v_vivienda, '#f97316', 'Zap',          TRUE, 2),
    (p_user_id, 'Agua (CAASD)',             'expense', v_vivienda, '#f97316', 'Droplets',     TRUE, 3),
    (p_user_id, 'Internet / TV / Telefonía','expense', v_vivienda, '#f97316', 'Wifi',         TRUE, 4),
    (p_user_id, 'Mantenimiento hogar',       'expense', v_vivienda, '#f97316', 'Wrench',       TRUE, 5),
    (p_user_id, 'Seguro hogar',              'expense', v_vivienda, '#f97316', 'Shield',       TRUE, 6);

  -- ── ALIMENTACIÓN ──────────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Alimentación', 'expense', '#eab308', 'ShoppingCart', TRUE, 3)
    RETURNING id INTO v_alimentacion;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Supermercado',           'expense', v_alimentacion, '#eab308', 'ShoppingCart', TRUE, 1),
    (p_user_id, 'Restaurantes',           'expense', v_alimentacion, '#eab308', 'UtensilsCrossed', TRUE, 2),
    (p_user_id, 'Delivery (Uber Eats)',   'expense', v_alimentacion, '#eab308', 'Bike',         TRUE, 3),
    (p_user_id, 'Cafetería / Snacks',     'expense', v_alimentacion, '#eab308', 'Coffee',       TRUE, 4);

  -- ── TRANSPORTE ────────────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Transporte', 'expense', '#8b5cf6', 'Car', TRUE, 4)
    RETURNING id INTO v_transporte;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Gasolina / Combustible',    'expense', v_transporte, '#8b5cf6', 'Fuel',         TRUE, 1),
    (p_user_id, 'Uber / Taxi',               'expense', v_transporte, '#8b5cf6', 'Car',          TRUE, 2),
    (p_user_id, 'Transporte público',         'expense', v_transporte, '#8b5cf6', 'Bus',          TRUE, 3),
    (p_user_id, 'Mantenimiento vehículo',     'expense', v_transporte, '#8b5cf6', 'Wrench',       TRUE, 4),
    (p_user_id, 'Peajes / Parqueos',          'expense', v_transporte, '#8b5cf6', 'ParkingCircle',TRUE, 5),
    (p_user_id, 'Seguro vehículo',            'expense', v_transporte, '#8b5cf6', 'Shield',       TRUE, 6);

  -- ── SALUD ─────────────────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Salud', 'expense', '#ef4444', 'Heart', TRUE, 5)
    RETURNING id INTO v_salud;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Médico / Consultas',       'expense', v_salud, '#ef4444', 'Stethoscope',  TRUE, 1),
    (p_user_id, 'Farmacia / Medicamentos',  'expense', v_salud, '#ef4444', 'Pill',         TRUE, 2),
    (p_user_id, 'Gimnasio / Fitness',       'expense', v_salud, '#ef4444', 'Dumbbell',     TRUE, 3),
    (p_user_id, 'Seguro médico / ARS',      'expense', v_salud, '#ef4444', 'Shield',       TRUE, 4);

  -- ── ENTRETENIMIENTO ───────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Entretenimiento', 'expense', '#ec4899', 'Smile', TRUE, 6)
    RETURNING id INTO v_entretenimiento;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Salidas / Ocio',           'expense', v_entretenimiento, '#ec4899', 'PartyPopper', TRUE, 1),
    (p_user_id, 'Streaming (Netflix etc.)', 'expense', v_entretenimiento, '#ec4899', 'Tv',          TRUE, 2),
    (p_user_id, 'Suscripciones digitales',  'expense', v_entretenimiento, '#ec4899', 'Globe',       TRUE, 3),
    (p_user_id, 'Hobbies / Pasatiempos',    'expense', v_entretenimiento, '#ec4899', 'Gamepad',     TRUE, 4);

  -- ── EDUCACIÓN ─────────────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Educación', 'expense', '#06b6d4', 'BookOpen', TRUE, 7)
    RETURNING id INTO v_educacion;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Cursos / Capacitación',    'expense', v_educacion, '#06b6d4', 'GraduationCap',TRUE, 1),
    (p_user_id, 'Libros / Materiales',      'expense', v_educacion, '#06b6d4', 'Book',         TRUE, 2),
    (p_user_id, 'Universidad / Tuition',    'expense', v_educacion, '#06b6d4', 'School',       TRUE, 3);

  -- ── CUIDADO PERSONAL ──────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Cuidado Personal', 'expense', '#d946ef', 'Sparkles', TRUE, 8)
    RETURNING id INTO v_cuidado;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Barbería / Salón',         'expense', v_cuidado, '#d946ef', 'Scissors',     TRUE, 1),
    (p_user_id, 'Ropa / Calzado',           'expense', v_cuidado, '#d946ef', 'ShoppingBag',  TRUE, 2),
    (p_user_id, 'Higiene / Cosméticos',     'expense', v_cuidado, '#d946ef', 'Droplets',     TRUE, 3);

  -- ── FINANZAS Y METAS ──────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Finanzas y Metas', 'saving', '#10b981', 'Target', TRUE, 9)
    RETURNING id INTO v_finanzas;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Diezmo / Ofrenda',         'saving', v_finanzas, '#10b981', 'Church',       TRUE, 1),
    (p_user_id, 'Fondo de Emergencia',       'saving', v_finanzas, '#10b981', 'Umbrella',     TRUE, 2),
    (p_user_id, 'Inversión (VOO / IBKR)',    'saving', v_finanzas, '#10b981', 'TrendingUp',   TRUE, 3),
    (p_user_id, 'Ahorro general',            'saving', v_finanzas, '#10b981', 'PiggyBank',    TRUE, 4);

  -- ── SERVICIOS FINANCIEROS ─────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Servicios Financieros', 'expense', '#6b7280', 'Building2', TRUE, 10)
    RETURNING id INTO v_servicios_fin;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Comisiones bancarias',     'expense', v_servicios_fin, '#6b7280', 'Landmark',     TRUE, 1),
    (p_user_id, 'Intereses pagados',        'expense', v_servicios_fin, '#6b7280', 'Percent',      TRUE, 2),
    (p_user_id, 'Seguros generales',        'expense', v_servicios_fin, '#6b7280', 'Shield',       TRUE, 3);

  -- ── VARIOS ────────────────────────────────────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Varios', 'expense', '#9ca3af', 'MoreHorizontal', TRUE, 11)
    RETURNING id INTO v_varios;

  INSERT INTO categories (user_id, name, kind, parent_id, color, icon, is_system, sort_order) VALUES
    (p_user_id, 'Regalos / Celebraciones',  'expense', v_varios, '#9ca3af', 'Gift',         TRUE, 1),
    (p_user_id, 'Donaciones',               'expense', v_varios, '#9ca3af', 'Heart',        TRUE, 2),
    (p_user_id, 'Gastos no clasificados',   'expense', v_varios, '#9ca3af', 'HelpCircle',   TRUE, 3);

  -- ── TRANSFERENCIAS (categoría especial) ───────────────────
  INSERT INTO categories (user_id, name, kind, color, icon, is_system, sort_order)
    VALUES (p_user_id, 'Transferencia entre cuentas', 'transfer', '#64748b', 'ArrowLeftRight', TRUE, 99);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- CONFIG inicial + categorías al crear un usuario
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Config por defecto
  INSERT INTO config (user_id, ingreso_bruto, ingreso_neto)
    VALUES (NEW.id, 0, 0);

  -- Categorías por defecto
  PERFORM create_default_categories(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
