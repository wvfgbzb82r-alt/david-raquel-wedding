"use client";

import { useEffect, useMemo, useState } from "react";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabase";

type Paciente = {
  id: string;
  numero_historia: number | null;
  nombre: string;
  apellidos: string;
};

type Cliente = {
  id: string;
  nombre: string;
  apellidos: string | null;
  nif_cif: string | null;
  telefono: string | null;
  movil: string | null;
  email: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  localidad: string | null;
  provincia: string | null;
  iva_tipo: "pendiente" | "exento" | "no_sujeto" | "sujeto" | null;
  iva_porcentaje: number | null;
  iva_exencion_texto: string | null;
  irpf_porcentaje: number | null;
  face_requiere: boolean | null;
  face_organo_gestor_codigo: string | null;
  face_organo_gestor_nombre: string | null;
  face_organo_gestor_rol: string | null;
  face_unidad_tramitadora_codigo: string | null;
  face_unidad_tramitadora_nombre: string | null;
  face_unidad_tramitadora_rol: string | null;
  face_oficina_contable_codigo: string | null;
  face_oficina_contable_nombre: string | null;
  face_oficina_contable_rol: string | null;
  face_organo_proponente_codigo: string | null;
  face_organo_proponente_nombre: string | null;
  face_organo_proponente_rol: string | null;
  invoice_template_id: string | null;
};

type Servicio = {
  id: string;
  nombre: string;
};

type Cobro = {
  id: string;
  patient_id: string | null;
  client_id: string | null;
  service_id: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
  fecha_cobro: string | null;
  concepto: string;
  concepto_codigo: string | null;
  importe: number;
  metodo_pago: string;
  estado: string;
  facturado: boolean;
  numero_factura: string | null;
  created_at: string;
};

type CobroConDatos = Cobro & {
  paciente?: Paciente;
  cliente?: Cliente | null;
  servicio?: Servicio | null;
};

type Factura = {
  id: string;
  client_id: string;
  numero_factura: string;
  serie: string | null;
  numero: number | null;
  etiqueta_facturacion: string | null;
  fecha: string;
  fecha_vencimiento: string | null;
  estado: string;
  subtotal: number;
  impuestos: number;
  total: number;
  observaciones: string | null;
  base_imponible: number | null;
  iva_tipo: string | null;
  iva_porcentaje: number | null;
  iva_importe: number | null;
  iva_exencion_texto: string | null;
  irpf_porcentaje: number | null;
  irpf_importe: number | null;
  face_requiere: boolean | null;
  cliente_nombre: string | null;
  cliente_nif_cif: string | null;
  cliente_direccion: string | null;
  cliente_codigo_postal: string | null;
  cliente_localidad: string | null;
  cliente_provincia: string | null;
  cliente_email: string | null;
  cliente_telefono: string | null;
  created_at: string;
  invoice_template_id: string | null;
  invoice_template_nombre: string | null;
  concepto_resumen: string | null;
  mostrar_pagado: boolean;
};

type FacturaConCliente = Factura & {
  cliente?: Cliente;
};

type LineaFactura = {
  id: string;
  invoice_id: string;
  payment_id: string | null;
  service_id: string | null;
  patient_id: string | null;
  concepto: string;
  etiqueta_facturacion: string | null;
  cantidad: number;
  precio_unitario: number;
  total: number;
};

type SecuenciaFactura = {
  anio: number;
  etiqueta: string;
  ultimo_numero: number;
};

type GrupoFacturacionBloque = {
  clave: string;
  client_id: string;
  patient_id: string;
  etiqueta: "A" | "B" | "C";
  clienteNombre: string;
  pacienteNombre: string;
  cobros: CobroConDatos[];
  numeroCobros: number;
  total: number;
  numeroPropuesto: string;
  conceptoPropuesto: string;
};

type ResultadoFacturacionBloque = {
  invoice_id: string;
  numero_factura: string;
  client_id: string;
  etiqueta_facturacion: string;
  total: number;
  numero_cobros: number;
};

type PlantillaWord = {
  id: string;
  nombre: string;
  descripcion: string | null;
  formato: "word";
  predeterminada: boolean;
  favorita: boolean;
  activa: boolean;
  archivo_nombre: string | null;
  archivo_storage_path: string | null;
  perfil_fiscal: string | null;
};

type PlantillaMensaje = {
  id: string;
  nombre: string;
  tipo: "correo" | "whatsapp";
  descripcion: string | null;
  categoria: string | null;
  predeterminada: boolean;
  favorita: boolean;
  activa: boolean;
  asunto: string | null;
  contenido: string | null;
};

type ClaveOrdenFactura =
  | "numero_factura"
  | "serie"
  | "numero"
  | "fecha"
  | "cliente"
  | "estado"
  | "total";

type DireccionOrden = "asc" | "desc";

type BusinessSettings = {
  nombre_comercial: string | null;
  razon_social: string | null;
  nif_cif: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  localidad: string | null;
  provincia: string | null;
  pais: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  iban: string | null;
};

type Pestana = "pendientes" | "facturas";

type Rango =
  | "todos"
  | "esteMes"
  | "mesAnterior"
  | "ultimos30"
  | "ultimos3Meses"
  | "esteAno"
  | "personalizado";

function fechaHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fechaISO(fecha: Date) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sumarDias(fecha: Date, dias: number) {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
}

function sumarMeses(fecha: Date, meses: number) {
  const nueva = new Date(fecha);
  nueva.setMonth(nueva.getMonth() + meses);
  return nueva;
}

function inicioMes(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function finMes(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
}

export default function FacturacionPage() {
  const [pestana, setPestana] = useState<Pestana>("pendientes");

  const [cobros, setCobros] = useState<CobroConDatos[]>([]);
  const [facturas, setFacturas] = useState<FacturaConCliente[]>([]);
  const [secuencias, setSecuencias] = useState<SecuenciaFactura[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [generandoBloque, setGenerandoBloque] = useState(false);
  const [mostrarBloque, setMostrarBloque] = useState(false);
  const [eliminandoFacturaId, setEliminandoFacturaId] = useState<string | null>(null);
  const [plantillasWord, setPlantillasWord] = useState<PlantillaWord[]>([]);
  const [plantillasMensajes, setPlantillasMensajes] = useState<PlantillaMensaje[]>([]);
  const [empresa, setEmpresa] = useState<BusinessSettings | null>(null);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState<string[]>([]);
  const [ordenFacturas, setOrdenFacturas] = useState<{
    clave: ClaveOrdenFactura;
    direccion: DireccionOrden;
  }>({ clave: "fecha", direccion: "desc" });
  const [tipoEnvioBloque, setTipoEnvioBloque] = useState<"whatsapp" | "correo" | null>(null);
  const [enviosAbiertos, setEnviosAbiertos] = useState<string[]>([]);

  const [facturaDocumento, setFacturaDocumento] = useState<FacturaConCliente | null>(null);
  const [plantillaWordId, setPlantillaWordId] = useState("");
  const [generandoWord, setGenerandoWord] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // =========================
  // FILTROS COBROS
  // =========================

  const [busqueda, setBusqueda] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroPaciente, setFiltroPaciente] = useState("");
  const [filtroServicio, setFiltroServicio] = useState("");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("");
  const [rango, setRango] = useState<Rango>("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // =========================
  // FILTROS FACTURAS
  // =========================

  const [busquedaFacturas, setBusquedaFacturas] = useState("");
  const [filtroSerieFactura, setFiltroSerieFactura] = useState("");
  const [filtroEstadoFactura, setFiltroEstadoFactura] = useState("");

  // =========================
  // NUEVA FACTURA
  // =========================

  const [fechaFactura, setFechaFactura] = useState(fechaHoy());
  const [fechaVencimientoFactura, setFechaVencimientoFactura] = useState("");
  const [observacionesFactura, setObservacionesFactura] = useState("");

  const [usarNumeroManual, setUsarNumeroManual] = useState(false);
  const [numeroManual, setNumeroManual] = useState("");

  const [mostrarGenerar, setMostrarGenerar] = useState(false);
  const [conceptoFactura, setConceptoFactura] = useState("");
  const [baseFacturaEdit, setBaseFacturaEdit] = useState("");
  const [edicionesBloque, setEdicionesBloque] = useState<Record<string, { numero: string; concepto: string; base: string }>>({});

  // =========================
  // DETALLE FACTURA
  // =========================

  const [facturaDetalle, setFacturaDetalle] =
    useState<FacturaConCliente | null>(null);

  const [lineasDetalle, setLineasDetalle] =
    useState<LineaFactura[]>([]);

  const [cargandoDetalle, setCargandoDetalle] =
    useState(false);

  useEffect(() => {
    cargarTodo();
  }, []);

  async function cargarTodo() {
    setCargando(true);
    setError("");

    try {
      await Promise.all([
        cargarCobros(),
        cargarFacturas(),
        cargarSecuencias(),
        cargarPacientes(),
        cargarClientes(),
        cargarServicios(),
        cargarPlantillasWord(),
        cargarPlantillasMensajes(),
        cargarEmpresa(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar Facturación."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarPlantillasWord() {
    const { data, error } = await supabase
      .from("templates")
      .select("id,nombre,descripcion,formato,predeterminada,favorita,activa,archivo_nombre,archivo_storage_path,perfil_fiscal")
      .eq("tipo", "factura")
      .eq("formato", "word")
      .eq("activa", true)
      .order("favorita", { ascending: false })
      .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    const lista = (data || []) as PlantillaWord[];
    setPlantillasWord(lista);

    if (!plantillaWordId && lista.length > 0) {
      setPlantillaWordId(lista[0].id);
    }
  }

  async function cargarPlantillasMensajes() {
    const { data, error } = await supabase
      .from("templates")
      .select("id,nombre,tipo,descripcion,categoria,predeterminada,favorita,activa,asunto,contenido")
      .in("tipo", ["correo", "whatsapp"])
      .eq("activa", true)
      .order("predeterminada", { ascending: false })
      .order("favorita", { ascending: false })
      .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    setPlantillasMensajes((data || []) as PlantillaMensaje[]);
  }

  async function cargarEmpresa() {
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    setEmpresa((data || null) as BusinessSettings | null);
  }

  async function cargarPacientes() {
    const { data, error } = await supabase
      .from("patients")
      .select("id,numero_historia,nombre,apellidos")
      .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    setPacientes((data || []) as Paciente[]);
  }

  async function cargarClientes() {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    setClientes((data || []) as Cliente[]);
  }

  async function cargarServicios() {
    const { data, error } = await supabase
      .from("services")
      .select("id,nombre")
      .order("nombre", { ascending: true });

    if (error) throw new Error(error.message);

    setServicios((data || []) as Servicio[]);
  }

  async function cargarCobros() {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("facturado", false)
      .order("fecha", { ascending: false });

    if (error) throw new Error(error.message);

    const lista = (data || []) as Cobro[];

    if (lista.length === 0) {
      setCobros([]);
      return;
    }

    const patientIds = [
      ...new Set(
        lista
          .map((item) => item.patient_id)
          .filter((valor): valor is string => Boolean(valor))
      ),
    ];

    const clientIds = [
      ...new Set(
        lista
          .map((item) => item.client_id)
          .filter((valor): valor is string => Boolean(valor))
      ),
    ];

    const serviceIds = [
      ...new Set(
        lista
          .map((item) => item.service_id)
          .filter((valor): valor is string => Boolean(valor))
      ),
    ];

    let pacientesData: Paciente[] = [];

    if (patientIds.length > 0) {
      const respuestaPacientes = await supabase
        .from("patients")
        .select("id,numero_historia,nombre,apellidos")
        .in("id", patientIds);

      if (respuestaPacientes.error) throw new Error(respuestaPacientes.error.message);
      pacientesData = (respuestaPacientes.data || []) as Paciente[];
    }

    let clientesData: Cliente[] = [];

    if (clientIds.length > 0) {
      const respuesta = await supabase
        .from("clients")
        .select("*")
        .in("id", clientIds);

      if (respuesta.error) throw new Error(respuesta.error.message);

      clientesData = (respuesta.data || []) as Cliente[];
    }

    let serviciosData: Servicio[] = [];

    if (serviceIds.length > 0) {
      const respuesta = await supabase
        .from("services")
        .select("id,nombre")
        .in("id", serviceIds);

      if (respuesta.error) throw new Error(respuesta.error.message);

      serviciosData = (respuesta.data || []) as Servicio[];
    }

    const mapaPacientes = new Map(
      ((pacientesData || []) as Paciente[]).map((item) => [
        item.id,
        item,
      ])
    );

    const mapaClientes = new Map(
      clientesData.map((item) => [
        item.id,
        item,
      ])
    );

    const mapaServicios = new Map(
      serviciosData.map((item) => [
        item.id,
        item,
      ])
    );

    setCobros(
      lista.map((cobro) => ({
        ...cobro,
        paciente: cobro.patient_id ? mapaPacientes.get(cobro.patient_id) : undefined,
        cliente: cobro.client_id
          ? mapaClientes.get(cobro.client_id) || null
          : null,
        servicio: cobro.service_id
          ? mapaServicios.get(cobro.service_id) || null
          : null,
      }))
    );
  }

  async function cargarSecuencias() {
    const { data, error } = await supabase
      .from("invoice_sequences")
      .select("anio,etiqueta,ultimo_numero");

    if (error) {
      throw new Error(error.message);
    }

    setSecuencias(
      (data || []) as SecuenciaFactura[]
    );
  }

  async function cargarFacturas() {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const lista = (data || []) as Factura[];

    if (lista.length === 0) {
      setFacturas([]);
      return;
    }

    const clientIds = [
      ...new Set(lista.map((item) => item.client_id)),
    ];

    const { data: clientesData, error: clientesError } = await supabase
      .from("clients")
      .select("*")
      .in("id", clientIds);

    if (clientesError) throw new Error(clientesError.message);

    const mapaClientes = new Map(
      ((clientesData || []) as Cliente[]).map((item) => [
        item.id,
        item,
      ])
    );

    setFacturas(
      lista.map((factura) => ({
        ...factura,
        cliente: mapaClientes.get(factura.client_id),
      }))
    );
  }

  function obtenerRango(): [string | null, string | null] {
    const hoy = new Date();
    hoy.setHours(12, 0, 0, 0);

    switch (rango) {
      case "esteMes":
        return [
          fechaISO(inicioMes(hoy)),
          fechaISO(finMes(hoy)),
        ];

      case "mesAnterior": {
        const anterior = sumarMeses(hoy, -1);

        return [
          fechaISO(inicioMes(anterior)),
          fechaISO(finMes(anterior)),
        ];
      }

      case "ultimos30":
        return [
          fechaISO(sumarDias(hoy, -30)),
          fechaISO(hoy),
        ];

      case "ultimos3Meses":
        return [
          fechaISO(sumarMeses(hoy, -3)),
          fechaISO(hoy),
        ];

      case "esteAno":
        return [
          `${hoy.getFullYear()}-01-01`,
          `${hoy.getFullYear()}-12-31`,
        ];

      case "personalizado":
        return [
          fechaDesde || null,
          fechaHasta || null,
        ];

      default:
        return [null, null];
    }
  }

  const cobrosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const [desde, hasta] = obtenerRango();

    return cobros.filter((cobro) => {
      if (
        filtroCliente &&
        cobro.client_id !== filtroCliente
      ) {
        return false;
      }

      if (
        filtroPaciente &&
        cobro.patient_id !== filtroPaciente
      ) {
        return false;
      }

      if (
        filtroServicio &&
        cobro.service_id !== filtroServicio
      ) {
        return false;
      }

      if (
        filtroEtiqueta &&
        cobro.concepto_codigo !== filtroEtiqueta
      ) {
        return false;
      }

      if (
        desde &&
        cobro.fecha < desde
      ) {
        return false;
      }

      if (
        hasta &&
        cobro.fecha > hasta
      ) {
        return false;
      }

      if (!texto) return true;

      const paciente = cobro.paciente
        ? `${cobro.paciente.nombre} ${cobro.paciente.apellidos}`
        : "";

      const cliente = cobro.cliente
        ? `${cobro.cliente.nombre} ${cobro.cliente.apellidos || ""}`
        : "";

      const servicio = cobro.servicio?.nombre || "";

      return [
        paciente,
        cliente,
        servicio,
        cobro.concepto,
        cobro.concepto_codigo,
      ]
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });
  }, [
    cobros,
    busqueda,
    filtroCliente,
    filtroPaciente,
    filtroServicio,
    filtroEtiqueta,
    rango,
    fechaDesde,
    fechaHasta,
  ]);

  const facturasFiltradas = useMemo(() => {
    const texto = busquedaFacturas.trim().toLowerCase();

    const lista = facturas.filter((factura) => {
      if (
        filtroSerieFactura &&
        factura.etiqueta_facturacion !== filtroSerieFactura
      ) {
        return false;
      }

      if (
        filtroEstadoFactura &&
        factura.estado !== filtroEstadoFactura
      ) {
        return false;
      }

      if (!texto) return true;

      const cliente = factura.cliente
        ? `${factura.cliente.nombre} ${factura.cliente.apellidos || ""}`
        : factura.cliente_nombre || "";

      return [
        factura.numero_factura,
        factura.serie,
        factura.estado,
        cliente,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(texto);
    });

    return [...lista].sort((a, b) => {
      const direccion = ordenFacturas.direccion === "asc" ? 1 : -1;

      const clienteA = a.cliente
        ? `${a.cliente.nombre} ${a.cliente.apellidos || ""}`.trim()
        : a.cliente_nombre || "";
      const clienteB = b.cliente
        ? `${b.cliente.nombre} ${b.cliente.apellidos || ""}`.trim()
        : b.cliente_nombre || "";

      let valorA: string | number = "";
      let valorB: string | number = "";

      switch (ordenFacturas.clave) {
        case "numero_factura":
          valorA = a.numero_factura || "";
          valorB = b.numero_factura || "";
          break;
        case "serie":
          valorA = a.serie || "";
          valorB = b.serie || "";
          break;
        case "numero":
          valorA = Number(a.numero || 0);
          valorB = Number(b.numero || 0);
          break;
        case "fecha":
          valorA = a.fecha || "";
          valorB = b.fecha || "";
          break;
        case "cliente":
          valorA = clienteA;
          valorB = clienteB;
          break;
        case "estado":
          valorA = a.estado || "";
          valorB = b.estado || "";
          break;
        case "total":
          valorA = Number(a.total || 0);
          valorB = Number(b.total || 0);
          break;
      }

      if (typeof valorA === "number" && typeof valorB === "number") {
        return (valorA - valorB) * direccion;
      }

      return String(valorA).localeCompare(String(valorB), "es", {
        numeric: true,
        sensitivity: "base",
      }) * direccion;
    });
  }, [
    facturas,
    busquedaFacturas,
    filtroSerieFactura,
    filtroEstadoFactura,
    ordenFacturas,
  ]);

  const facturasSeleccionadasDatos = useMemo(
    () =>
      facturasFiltradas.filter((factura) =>
        facturasSeleccionadas.includes(factura.id)
      ),
    [facturasFiltradas, facturasSeleccionadas]
  );

  const facturasSeleccionadasEnviables = useMemo(
    () =>
      facturasSeleccionadasDatos.filter(
        (factura) => factura.estado !== "Anulada"
      ),
    [facturasSeleccionadasDatos]
  );

  const todasFacturasVisiblesSeleccionadas =
    facturasFiltradas.length > 0 &&
    facturasFiltradas.every((factura) =>
      facturasSeleccionadas.includes(factura.id)
    );


  const cobrosSeleccionados = useMemo(
    () =>
      cobros.filter((cobro) =>
        seleccionados.includes(cobro.id)
      ),
    [cobros, seleccionados]
  );

  const totalSeleccionado = useMemo(
    () =>
      cobrosSeleccionados.reduce(
        (suma, cobro) =>
          suma + Number(cobro.importe),
        0
      ),
    [cobrosSeleccionados]
  );

  const clienteSeleccionadoId = useMemo(() => {
    const ids = [
      ...new Set(
        cobrosSeleccionados
          .map((cobro) => cobro.client_id)
          .filter((valor): valor is string => Boolean(valor))
      ),
    ];

    return ids.length === 1 ? ids[0] : null;
  }, [cobrosSeleccionados]);

  const pacienteSeleccionadoClave = useMemo(() => {
    const claves = [
      ...new Set(
        cobrosSeleccionados.map((cobro) => cobro.patient_id || "__SIN_PACIENTE__")
      ),
    ];

    return claves.length === 1 ? claves[0] : null;
  }, [cobrosSeleccionados]);

  const etiquetaSeleccionada = useMemo(() => {
    const etiquetas = [
      ...new Set(
        cobrosSeleccionados
          .map((cobro) => cobro.concepto_codigo)
          .filter((valor): valor is string =>
            valor === "A" || valor === "B" || valor === "C"
          )
      ),
    ];

    return etiquetas.length === 1 ? etiquetas[0] : null;
  }, [cobrosSeleccionados]);

  const seleccionValida =
    cobrosSeleccionados.length > 0 &&
    clienteSeleccionadoId !== null &&
    pacienteSeleccionadoClave !== null &&
    etiquetaSeleccionada !== null &&
    cobrosSeleccionados.every(
      (cobro) =>
        cobro.client_id === clienteSeleccionadoId &&
        (cobro.patient_id || "__SIN_PACIENTE__") === pacienteSeleccionadoClave &&
        cobro.concepto_codigo === etiquetaSeleccionada
    );

  const seriePrevista = useMemo(() => {
    if (!etiquetaSeleccionada || !fechaFactura) {
      return "";
    }

    const anio = fechaFactura.slice(0, 4);

    return `${anio}-${etiquetaSeleccionada}`;
  }, [fechaFactura, etiquetaSeleccionada]);

  const numeroAutomaticoPropuesto = useMemo(() => {
    if (!etiquetaSeleccionada || !fechaFactura) {
      return "";
    }

    const anio = Number(fechaFactura.slice(0, 4));

    if (!Number.isInteger(anio)) {
      return "";
    }

    const secuencia = secuencias.find(
      (item) =>
        item.anio === anio &&
        item.etiqueta === etiquetaSeleccionada
    );

    let siguiente =
      Number(secuencia?.ultimo_numero || 0) + 1;

    const numerosOcupados = new Set(
      facturas
        .filter(
          (factura) =>
            factura.serie === `${anio}-${etiquetaSeleccionada}` &&
            factura.numero !== null
        )
        .map((factura) => Number(factura.numero))
    );

    while (numerosOcupados.has(siguiente)) {
      siguiente += 1;
    }

    return `${anio}-${etiquetaSeleccionada}-${String(siguiente).padStart(4, "0")}`;
  }, [
    etiquetaSeleccionada,
    fechaFactura,
    secuencias,
    facturas,
  ]);

  const numeroManualCompleto = useMemo(() => {
    if (
      !usarNumeroManual ||
      !seriePrevista ||
      !numeroManual
    ) {
      return "";
    }

    const numero = Number(numeroManual);

    if (!Number.isInteger(numero) || numero <= 0) {
      return "";
    }

    return `${seriePrevista}-${String(numero).padStart(4, "0")}`;
  }, [
    usarNumeroManual,
    seriePrevista,
    numeroManual,
  ]);

  const incidenciasBloque = useMemo(() => {
    return cobrosSeleccionados.filter(
      (cobro) =>
        !cobro.client_id ||
        !["A", "B", "C"].includes(cobro.concepto_codigo || "")
    );
  }, [cobrosSeleccionados]);

  const gruposFacturacionBloque = useMemo<GrupoFacturacionBloque[]>(() => {
    if (cobrosSeleccionados.length === 0) {
      return [];
    }

    const anio = Number(fechaFactura.slice(0, 4));

    if (!Number.isInteger(anio)) {
      return [];
    }

    const mapa = new Map<
      string,
      {
        client_id: string;
        patient_id: string;
        etiqueta: "A" | "B" | "C";
        cobros: CobroConDatos[];
      }
    >();

    for (const cobro of cobrosSeleccionados) {
      if (!cobro.client_id) {
        continue;
      }

      if (
        cobro.concepto_codigo !== "A" &&
        cobro.concepto_codigo !== "B" &&
        cobro.concepto_codigo !== "C"
      ) {
        continue;
      }

      const clave = `${cobro.client_id}|${cobro.patient_id || "__SIN_PACIENTE__"}|${cobro.concepto_codigo}`;

      const actual = mapa.get(clave);

      if (actual) {
        actual.cobros.push(cobro);
      } else {
        mapa.set(clave, {
          client_id: cobro.client_id,
          patient_id: cobro.patient_id || "__SIN_PACIENTE__",
          etiqueta: cobro.concepto_codigo,
          cobros: [cobro],
        });
      }
    }

    const gruposOrdenados = [...mapa.entries()]
      .sort(([claveA], [claveB]) => claveA.localeCompare(claveB));

    const ocupadosPorSerie = new Map<string, Set<number>>();

    for (const factura of facturas) {
      if (
        factura.serie &&
        factura.numero !== null
      ) {
        const serieFactura = factura.serie;

        if (!ocupadosPorSerie.has(serieFactura)) {
          ocupadosPorSerie.set(serieFactura, new Set<number>());
        }

        ocupadosPorSerie
          .get(serieFactura)!
          .add(Number(factura.numero));
      }
    }

    const siguientePorEtiqueta = new Map<string, number>();

    for (const etiqueta of ["A", "B", "C"]) {
      const secuencia = secuencias.find(
        (item) =>
          item.anio === anio &&
          item.etiqueta === etiqueta
      );

      siguientePorEtiqueta.set(
        etiqueta,
        Number(secuencia?.ultimo_numero || 0) + 1
      );
    }

    return gruposOrdenados.map(([clave, grupo]) => {
      const serie = `${anio}-${grupo.etiqueta}`;

      const ocupados =
        ocupadosPorSerie.get(serie) || new Set<number>();

      let siguiente =
        siguientePorEtiqueta.get(grupo.etiqueta) || 1;

      while (ocupados.has(siguiente)) {
        siguiente += 1;
      }

      siguientePorEtiqueta.set(
        grupo.etiqueta,
        siguiente + 1
      );

      const cliente = clientes.find(
        (item) => item.id === grupo.client_id
      );

      const paciente =
        grupo.cobros.find((cobro) => cobro.patient_id === grupo.patient_id)?.paciente;

      const total = grupo.cobros.reduce(
        (suma, cobro) => suma + Number(cobro.importe),
        0
      );

      return {
        clave,
        client_id: grupo.client_id,
        patient_id: grupo.patient_id,
        etiqueta: grupo.etiqueta,
        clienteNombre: cliente
          ? `${cliente.nombre} ${cliente.apellidos || ""}`.trim()
          : "Cliente sin nombre",
        pacienteNombre: paciente
          ? `${paciente.nombre} ${paciente.apellidos || ""}`.trim()
          : "Paciente sin nombre",
        cobros: grupo.cobros,
        numeroCobros: grupo.cobros.length,
        total,
        numeroPropuesto:
          `${serie}-${String(siguiente).padStart(4, "0")}`,
        conceptoPropuesto: [...new Set(grupo.cobros.map((c) => c.concepto).filter(Boolean))].join(" / "),
      };
    });
  }, [
    cobrosSeleccionados,
    fechaFactura,
    facturas,
    secuencias,
    clientes,
  ]);

  const totalBloque = useMemo(
    () =>
      gruposFacturacionBloque.reduce(
        (suma, grupo) => suma + grupo.total,
        0
      ),
    [gruposFacturacionBloque]
  );

  const totalBloqueFiscal = useMemo(() => {
    return gruposFacturacionBloque.reduce((suma, grupo) => {
      const cliente = clientes.find((item) => item.id === grupo.client_id);
      if (!cliente || cliente.iva_tipo === "pendiente" || !cliente.iva_tipo) return suma;
      const edit = edicionesBloque[grupo.clave];
      const base = edit?.base !== undefined && edit.base !== "" ? Number(edit.base.replace(",", ".")) : grupo.total;
      return suma + calcularFiscalidad(Number.isFinite(base) ? base : grupo.total, cliente).total;
    }, 0);
  }, [gruposFacturacionBloque, clientes, edicionesBloque]);

  const clientesFiscalidadPendienteBloque = useMemo(() => {
    const ids = [...new Set(gruposFacturacionBloque.map((grupo) => grupo.client_id))];
    return ids
      .map((id) => clientes.find((item) => item.id === id))
      .filter((cliente): cliente is Cliente => Boolean(cliente))
      .filter((cliente) => !cliente.iva_tipo || cliente.iva_tipo === "pendiente");
  }, [gruposFacturacionBloque, clientes]);

  function alternarSeleccion(id: string) {
    setSeleccionados((actual) =>
      actual.includes(id)
        ? actual.filter((item) => item !== id)
        : [...actual, id]
    );
  }

  function seleccionarTodosVisibles() {
    const ids = cobrosFiltrados.map((item) => item.id);

    const todosMarcados =
      ids.length > 0 &&
      ids.every((id) => seleccionados.includes(id));

    if (todosMarcados) {
      setSeleccionados((actual) =>
        actual.filter((id) => !ids.includes(id))
      );
    } else {
      setSeleccionados((actual) => [
        ...new Set([
          ...actual,
          ...ids,
        ]),
      ]);
    }
  }

  function limpiarPreparacionFactura() {
    setFechaFactura(fechaHoy());
    setFechaVencimientoFactura("");
    setObservacionesFactura("");
    setUsarNumeroManual(false);
    setNumeroManual("");
  }

  function prepararFactura() {
    setError("");
    setMensaje("");

    if (cobrosSeleccionados.length === 0) {
      setError(
        "Selecciona al menos un cobro."
      );
      return;
    }

    if (clienteSeleccionadoId === null) {
      setError(
        "Todos los cobros de una factura deben pertenecer al mismo cliente de facturación."
      );
      return;
    }

    if (etiquetaSeleccionada === null) {
      setError(
        "No se pueden mezclar cobros A, B y C en una misma factura."
      );
      return;
    }

    limpiarPreparacionFactura();
    setMostrarBloque(false);
    setMostrarGenerar(true);
  }

  function prepararFacturacionBloque() {
    setError("");
    setMensaje("");

    if (cobrosSeleccionados.length === 0) {
      setError(
        "Selecciona al menos un cobro."
      );
      return;
    }

    limpiarPreparacionFactura();
    setMostrarGenerar(false);
    setMostrarBloque(true);
  }

  async function aplicarFiscalidadFactura(invoiceId: string, baseOverride?: number, conceptoResumen?: string) {
    const { data: facturaData, error: facturaError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (facturaError) throw new Error(facturaError.message);

    const factura = facturaData as Factura;

    const { data: clienteData, error: clienteError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", factura.client_id)
      .single();

    if (clienteError) throw new Error(clienteError.message);

    const cliente = clienteData as Cliente;
    const ivaTipo = cliente.iva_tipo || "pendiente";

    if (ivaTipo === "pendiente") {
      throw new Error(
        `El cliente ${cliente.nombre} ${cliente.apellidos || ""} tiene la fiscalidad pendiente de configurar.`
      );
    }

    const base = Number.isFinite(baseOverride) ? Number(baseOverride) : Number(factura.subtotal || 0);
    const ivaPorcentaje = ivaTipo === "sujeto" ? Number(cliente.iva_porcentaje || 0) : 0;
    const irpfPorcentaje = Number(cliente.irpf_porcentaje || 0);
    const ivaImporte = Math.round((base * ivaPorcentaje) / 100 * 100) / 100;
    const irpfImporte = Math.round((base * irpfPorcentaje) / 100 * 100) / 100;
    const total = Math.round((base + ivaImporte - irpfImporte) * 100) / 100;

    const clienteNombre = `${cliente.nombre} ${cliente.apellidos || ""}`.trim();
    const clienteTelefono = cliente.movil || cliente.telefono || null;
    const plantillaAsignada = plantillaFiscalAutomatica(cliente, plantillasWord);

    if (!plantillaAsignada) {
      throw new Error(
        `No hay una plantilla Word activa asignada al perfil fiscal de ${clienteNombre}. Revisa Gestión de Plantillas.`
      );
    }

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        base_imponible: base,
        iva_tipo: ivaTipo,
        iva_porcentaje: ivaPorcentaje,
        iva_importe: ivaImporte,
        iva_exencion_texto:
          ivaTipo === "exento" ? cliente.iva_exencion_texto || null : null,
        irpf_porcentaje: irpfPorcentaje,
        irpf_importe: irpfImporte,
        impuestos: ivaImporte - irpfImporte,
        total,
        face_requiere: cliente.face_requiere === true,
        face_organo_gestor_codigo: cliente.face_organo_gestor_codigo || null,
        face_organo_gestor_nombre: cliente.face_organo_gestor_nombre || null,
        face_organo_gestor_rol: cliente.face_organo_gestor_rol || null,
        face_unidad_tramitadora_codigo: cliente.face_unidad_tramitadora_codigo || null,
        face_unidad_tramitadora_nombre: cliente.face_unidad_tramitadora_nombre || null,
        face_unidad_tramitadora_rol: cliente.face_unidad_tramitadora_rol || null,
        face_oficina_contable_codigo: cliente.face_oficina_contable_codigo || null,
        face_oficina_contable_nombre: cliente.face_oficina_contable_nombre || null,
        face_oficina_contable_rol: cliente.face_oficina_contable_rol || null,
        face_organo_proponente_codigo: cliente.face_organo_proponente_codigo || null,
        face_organo_proponente_nombre: cliente.face_organo_proponente_nombre || null,
        face_organo_proponente_rol: cliente.face_organo_proponente_rol || null,
        cliente_nombre: clienteNombre,
        cliente_nif_cif: cliente.nif_cif || null,
        cliente_direccion: cliente.direccion || null,
        cliente_codigo_postal: cliente.codigo_postal || null,
        cliente_localidad: cliente.localidad || null,
        cliente_provincia: cliente.provincia || null,
        cliente_email: cliente.email || null,
        cliente_telefono: clienteTelefono,
        invoice_template_id: plantillaAsignada?.id || null,
        invoice_template_nombre: plantillaAsignada?.nombre || null,
        concepto_resumen: conceptoResumen?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    if (updateError) throw new Error(updateError.message);

    if (Number.isFinite(baseOverride) && Math.abs(base - Number(factura.subtotal || 0)) > 0.004) {
      const { data: lineas, error: lineasError } = await supabase.from("invoice_lines").select("id,total,cantidad").eq("invoice_id", invoiceId).order("created_at", { ascending: true });
      if (lineasError) throw new Error(lineasError.message);
      const lista = lineas || [];
      if (lista.length > 0) {
        const sumaAnterior = lista.reduce((acc, l) => acc + Number(l.total || 0), 0);
        const ultima = lista[lista.length - 1];
        const nuevoTotalUltima = Math.round((Number(ultima.total || 0) + (base - sumaAnterior)) * 100) / 100;
        if (nuevoTotalUltima < 0) throw new Error("La base editada produce una línea negativa. Revisa el importe base.");
        const cantidad = Number(ultima.cantidad || 1) || 1;
        const { error: lineaError } = await supabase.from("invoice_lines").update({ total: nuevoTotalUltima, precio_unitario: Math.round((nuevoTotalUltima / cantidad) * 100) / 100 }).eq("id", ultima.id);
        if (lineaError) throw new Error(lineaError.message);
        await supabase.from("invoices").update({ subtotal: base }).eq("id", invoiceId);
      }
    }
  }

  async function generarFacturacionBloque() {
    if (generandoBloque) return;

    setError("");
    setMensaje("");

    if (cobrosSeleccionados.length === 0) {
      setError(
        "Selecciona al menos un cobro."
      );
      return;
    }

    if (incidenciasBloque.length > 0) {
      setError(
        "Hay cobros sin cliente de facturación o sin etiqueta A, B o C. Corrige esas incidencias antes de facturar el lote."
      );
      return;
    }

    if (gruposFacturacionBloque.length === 0) {
      setError(
        "No hay grupos válidos para facturar."
      );
      return;
    }

    if (clientesFiscalidadPendienteBloque.length > 0) {
      setError(
        `Hay ${clientesFiscalidadPendienteBloque.length} cliente${clientesFiscalidadPendienteBloque.length === 1 ? "" : "s"} con la fiscalidad pendiente. Configura Cliente → Económico antes de facturar el lote.`
      );
      return;
    }

    const gruposSinPlantilla = gruposFacturacionBloque.filter((grupo) => {
      const cliente = clientes.find((item) => item.id === grupo.client_id);
      return !cliente || !plantillaFiscalAutomatica(cliente, plantillasWord);
    });

    if (gruposSinPlantilla.length > 0) {
      const nombres = [
        ...new Set(gruposSinPlantilla.map((grupo) => grupo.clienteNombre)),
      ];

      setError(
        `No se puede iniciar la facturación en bloque porque falta una plantilla fiscal activa para: ${nombres.join(
          ", "
        )}. Revisa Gestión de Plantillas.`
      );
      return;
    }

    setGenerandoBloque(true);

    try {
      const resultado: ResultadoFacturacionBloque[] = [];
      for (const grupo of gruposFacturacionBloque) {
        const edit = edicionesBloque[grupo.clave];
        const numeroTexto = (edit?.numero || grupo.numeroPropuesto).trim();
        const numero = Number(numeroTexto.split("-").pop());
        const base = Number((edit?.base ?? String(grupo.total)).replace(",", "."));
        const concepto = (edit?.concepto ?? grupo.conceptoPropuesto).trim();
        if (!Number.isInteger(numero) || numero <= 0) throw new Error(`Número no válido para ${grupo.clienteNombre} · ${grupo.pacienteNombre}.`);
        if (!Number.isFinite(base) || base < 0) throw new Error(`Base no válida para ${grupo.clienteNombre} · ${grupo.pacienteNombre}.`);
        const { data, error: rpcError } = await supabase.rpc("crear_factura_desde_cobros", {
          p_payment_ids: grupo.cobros.map((c) => c.id),
          p_fecha: fechaFactura,
          p_fecha_vencimiento: fechaVencimientoFactura || null,
          p_observaciones: observacionesFactura.trim() || null,
          p_numero_manual: numero,
        });
        if (rpcError) throw new Error(rpcError.message);
        const creada = Array.isArray(data) ? data[0] : data;
        const invoiceId = creada?.invoice_id || creada?.id;
        if (!invoiceId) throw new Error(`No se pudo identificar la factura de ${grupo.clienteNombre} · ${grupo.pacienteNombre}.`);
        await aplicarFiscalidadFactura(invoiceId, base, concepto);
        resultado.push({ invoice_id: invoiceId, numero_factura: creada?.numero_factura || numeroTexto, client_id: grupo.client_id, etiqueta_facturacion: grupo.etiqueta, total: base, numero_cobros: grupo.numeroCobros });
      }

      const numeros = resultado.map((item) => item.numero_factura).filter(Boolean);
      setMensaje(resultado.length === 1 ? `Factura ${numeros[0] || ""} generada correctamente.` : `${resultado.length} facturas generadas correctamente: ${numeros.join(", ")}`);

      setSeleccionados([]);
      setMostrarBloque(false);
      limpiarPreparacionFactura();

      await Promise.all([
        cargarCobros(),
        cargarFacturas(),
        cargarSecuencias(),
      ]);

      setPestana("facturas");
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo completar la facturación en bloque: ${err.message}`
          : "No se pudo completar la facturación en bloque."
      );
    } finally {
      setGenerandoBloque(false);
    }
  }

  async function generarFactura() {
    if (generando) return;

    setError("");
    setMensaje("");

    if (!seleccionValida) {
      setError(
        "La selección no es válida. Todos los cobros deben tener el mismo cliente, el mismo paciente (o todos sin paciente) y la misma etiqueta A, B o C."
      );
      return;
    }

    let numeroManualNumero: number | null = null;

    if (usarNumeroManual) {
      numeroManualNumero = Number(numeroManual);

      if (
        !Number.isInteger(numeroManualNumero) ||
        numeroManualNumero <= 0
      ) {
        setError(
          "El número manual debe ser un número entero mayor que 0."
        );
        return;
      }
    }

    const clienteFiscal = clienteSeleccionadoId
      ? clientes.find((item) => item.id === clienteSeleccionadoId)
      : null;

    if (!clienteFiscal || !clienteFiscal.iva_tipo || clienteFiscal.iva_tipo === "pendiente") {
      setError("Configura primero Cliente → Económico (IVA e IRPF) antes de generar la factura.");
      return;
    }

    const plantillaFiscal = plantillaFiscalAutomatica(
      clienteFiscal,
      plantillasWord
    );

    if (!plantillaFiscal) {
      setError(
        "No hay una plantilla Word activa para el tipo fiscal de este cliente. Revisa Gestión de Plantillas antes de generar la factura."
      );
      return;
    }

    setGenerando(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "crear_factura_desde_cobros",
        {
          p_payment_ids: seleccionados,
          p_fecha: fechaFactura,
          p_fecha_vencimiento:
            fechaVencimientoFactura || null,
          p_observaciones:
            observacionesFactura.trim() || null,
          p_numero_manual:
            numeroManualNumero,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      const facturaCreada = Array.isArray(data)
        ? data[0]
        : data;

      if (facturaCreada?.invoice_id || facturaCreada?.id) {
        const baseEditada = Number((baseFacturaEdit || String(totalSeleccionado)).replace(",", "."));
        await aplicarFiscalidadFactura(
          facturaCreada.invoice_id || facturaCreada.id,
          Number.isFinite(baseEditada) ? baseEditada : totalSeleccionado,
          conceptoFactura
        );
      }

      const numeroGenerado =
        facturaCreada?.numero_factura ||
        "la factura";

      setMensaje(
        `Factura ${numeroGenerado} generada correctamente.`
      );

      setSeleccionados([]);
      setMostrarGenerar(false);
      limpiarPreparacionFactura();

      await Promise.all([
        cargarCobros(),
        cargarFacturas(),
        cargarSecuencias(),
      ]);

      setPestana("facturas");
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo generar la factura: ${err.message}`
          : "No se pudo generar la factura."
      );
    } finally {
      setGenerando(false);
    }
  }

  async function actualizarMostrarPagado(
    factura: FacturaConCliente,
    valor: boolean
  ) {
    setError("");
    setMensaje("");

    try {
      const { error } = await supabase
        .from("invoices")
        .update({ mostrar_pagado: valor })
        .eq("id", factura.id);

      if (error) throw new Error(error.message);

      setFacturas((actuales) =>
        actuales.map((item) =>
          item.id === factura.id
            ? { ...item, mostrar_pagado: valor }
            : item
        )
      );

      setFacturaDocumento((actual) =>
        actual?.id === factura.id
          ? { ...actual, mostrar_pagado: valor }
          : actual
      );

      setFacturaDetalle((actual) =>
        actual?.id === factura.id
          ? { ...actual, mostrar_pagado: valor }
          : actual
      );

      setMensaje(
        valor
          ? `La factura ${factura.numero_factura} mostrará PAGADO en el documento.`
          : `La factura ${factura.numero_factura} ya no mostrará PAGADO en el documento.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo actualizar la indicación PAGADO: ${err.message}`
          : "No se pudo actualizar la indicación PAGADO."
      );
    }
  }

  function prepararWord(factura: FacturaConCliente) {
    setError("");
    setMensaje("");

    if (plantillasWord.length === 0) {
      setError(
        "No hay ninguna plantilla Word activa con archivo. Ve a Gestión de Plantillas y sube una plantilla .docx."
      );
      return;
    }

    const cliente = factura.cliente || clientes.find((c) => c.id === factura.client_id);
    const asignada = factura.invoice_template_id
      ? plantillasWord.find((p) => p.id === factura.invoice_template_id)
      : cliente
      ? plantillaFiscalAutomatica(cliente, plantillasWord)
      : null;

    if (!asignada) {
      setError(
        "No hay una plantilla fiscal activa compatible con el IVA e IRPF de este cliente. Revisa Gestión de Plantillas."
      );
      return;
    }

    setPlantillaWordId(asignada.id);
    setFacturaDocumento(factura);
  }

  async function generarWordFactura() {
    if (!facturaDocumento || !plantillaWordId || generandoWord) return;

    setGenerandoWord(true);
    setError("");
    setMensaje("");

    try {
      const plantilla = plantillasWord.find(
        (item) => item.id === plantillaWordId
      );

      if (!plantilla) {
        throw new Error("No se ha encontrado la plantilla seleccionada.");
      }

      if (!plantilla.archivo_storage_path) {
        throw new Error(
          "La plantilla seleccionada no tiene un archivo Word asociado."
        );
      }

      const [
        respuestaLineas,
        respuestaEmpresa,
        respuestaArchivo,
      ] = await Promise.all([
        supabase
          .from("invoice_lines")
          .select("*")
          .eq("invoice_id", facturaDocumento.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("business_settings")
          .select("*")
          .limit(1)
          .maybeSingle(),
        supabase.storage
          .from("templates")
          .download(plantilla.archivo_storage_path),
      ]);

      if (respuestaLineas.error) {
        throw new Error(respuestaLineas.error.message);
      }

      if (respuestaEmpresa.error) {
        throw new Error(respuestaEmpresa.error.message);
      }

      if (respuestaArchivo.error) {
        throw new Error(respuestaArchivo.error.message);
      }

      const lineas = (respuestaLineas.data || []) as LineaFactura[];
      const empresa = (respuestaEmpresa.data || {}) as BusinessSettings;

      const patientIds = [
        ...new Set(
          lineas
            .map((linea) => linea.patient_id)
            .filter((valor): valor is string => Boolean(valor))
        ),
      ];

      let pacientesDocumento: Paciente[] = [];

      if (patientIds.length > 0) {
        const { data, error } = await supabase
          .from("patients")
          .select("id,numero_historia,nombre,apellidos")
          .in("id", patientIds);

        if (error) throw new Error(error.message);

        pacientesDocumento = (data || []) as Paciente[];
      }

      const mapaPacientes = new Map(
        pacientesDocumento.map((paciente) => [paciente.id, paciente])
      );

      const blob = respuestaArchivo.data;
      const arrayBuffer = await blob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: "{{",
          end: "}}",
        },
      });

      const clienteActual =
        facturaDocumento.cliente ||
        clientes.find((item) => item.id === facturaDocumento.client_id);

      const nombreCliente =
        facturaDocumento.cliente_nombre ||
        (clienteActual
          ? `${clienteActual.nombre} ${clienteActual.apellidos || ""}`.trim()
          : "");

      const nifCliente =
        facturaDocumento.cliente_nif_cif ||
        clienteActual?.nif_cif ||
        "";

      const direccionCliente =
        facturaDocumento.cliente_direccion ||
        clienteActual?.direccion ||
        "";

      const cpCliente =
        facturaDocumento.cliente_codigo_postal ||
        clienteActual?.codigo_postal ||
        "";

      const localidadCliente =
        facturaDocumento.cliente_localidad ||
        clienteActual?.localidad ||
        "";

      const provinciaCliente =
        facturaDocumento.cliente_provincia ||
        clienteActual?.provincia ||
        "";

      const pacientesUnicos = [
        ...new Map(
          pacientesDocumento.map((paciente) => [
            paciente.id,
            `${paciente.nombre} ${paciente.apellidos}`.trim(),
          ])
        ).values(),
      ];

      const ivaTexto =
        facturaDocumento.iva_tipo === "exento"
          ? "Exento"
          : facturaDocumento.iva_tipo === "no_sujeto"
          ? "No sujeto"
          : facturaDocumento.iva_tipo === "sujeto"
          ? `${porcentaje(facturaDocumento.iva_porcentaje)} %`
          : "";

      const datos = {
        factura_numero: facturaDocumento.numero_factura || "",
        factura_serie: facturaDocumento.serie || "",
        factura_numero_serie: facturaDocumento.numero ?? "",
        factura_fecha: formatearFecha(facturaDocumento.fecha),
        factura_fecha_vencimiento: facturaDocumento.fecha_vencimiento
          ? formatearFecha(facturaDocumento.fecha_vencimiento)
          : "",
        factura_estado: facturaDocumento.estado || "",
        factura_observaciones: facturaDocumento.observaciones || "",
        factura_concepto: facturaDocumento.concepto_resumen || "",

        cliente_nombre: nombreCliente,
        cliente_nif: nifCliente,
        cliente_direccion: direccionCliente,
        cliente_codigo_postal: cpCliente,
        cliente_localidad: localidadCliente,
        cliente_provincia: provinciaCliente,
        cliente_email:
          facturaDocumento.cliente_email || clienteActual?.email || "",
        cliente_telefono:
          facturaDocumento.cliente_telefono ||
          clienteActual?.movil ||
          clienteActual?.telefono ||
          "",

        paciente_nombre: pacientesUnicos.join(", "),

        emisor_nombre:
          empresa.nombre_comercial || empresa.razon_social || "",
        emisor_razon_social: empresa.razon_social || "",
        emisor_nif: empresa.nif_cif || "",
        emisor_direccion: empresa.direccion || "",
        emisor_codigo_postal: empresa.codigo_postal || "",
        emisor_localidad: empresa.localidad || "",
        emisor_provincia: empresa.provincia || "",
        emisor_pais: empresa.pais || "",
        emisor_telefono: empresa.telefono || "",
        emisor_email: empresa.email || "",
        emisor_web: empresa.web || "",
        emisor_iban: empresa.iban || "",

        base_imponible: formatearImporte(
          facturaDocumento.base_imponible ?? facturaDocumento.subtotal
        ),
        iva_tipo: ivaTexto,
        iva_porcentaje: porcentaje(facturaDocumento.iva_porcentaje),
        iva_importe: formatearImporte(
          Number(facturaDocumento.iva_importe || 0)
        ),
        irpf_porcentaje: porcentaje(facturaDocumento.irpf_porcentaje),
        irpf_importe: formatearImporte(
          Number(facturaDocumento.irpf_importe || 0)
        ),
        total_factura: formatearImporte(facturaDocumento.total),
        texto_exencion: facturaDocumento.iva_exencion_texto || "",
        mostrar_pagado: Boolean(facturaDocumento.mostrar_pagado),
        pagado_texto: facturaDocumento.mostrar_pagado ? "PAGADO" : "",

        lineas: lineas.map((linea) => {
          const paciente = linea.patient_id
            ? mapaPacientes.get(linea.patient_id)
            : null;

          return {
            descripcion: linea.concepto || "",
            unidades: Number(linea.cantidad || 1).toLocaleString("es-ES"),
            precio_unitario: formatearImporte(
              Number(linea.precio_unitario || 0)
            ),
            importe: formatearImporte(Number(linea.total || 0)),
            paciente: paciente
              ? `${paciente.nombre} ${paciente.apellidos}`.trim()
              : "",
          };
        }),
      };

      doc.render(datos);

      const colorCorporativo = "002060";
      const namespaceWord =
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

      const obtenerHijos = (elemento: Element, nombreLocal: string) =>
        Array.from(elemento.children).filter(
          (hijo) => hijo.localName === nombreLocal
        );

      const primerHijo = (elemento: Element, nombreLocal: string) =>
        obtenerHijos(elemento, nombreLocal)[0] || null;

      const asegurarPropiedadesRun = (
        documentoXml: XMLDocument,
        run: Element
      ) => {
        let propiedades = primerHijo(run, "rPr");

        if (!propiedades) {
          propiedades = documentoXml.createElementNS(namespaceWord, "w:rPr");
          run.insertBefore(propiedades, run.firstChild);
        }

        return propiedades;
      };

      const aplicarColorUniforme = (documentoXml: XMLDocument) => {
        const runs = Array.from(
          documentoXml.getElementsByTagNameNS(namespaceWord, "r")
        );

        runs.forEach((run) => {
          const propiedades = asegurarPropiedadesRun(documentoXml, run);
          let color = primerHijo(propiedades, "color");

          if (!color) {
            color = documentoXml.createElementNS(namespaceWord, "w:color");
            propiedades.appendChild(color);
          }

          color.setAttributeNS(namespaceWord, "w:val", colorCorporativo);
        });
      };

      const textoElemento = (elemento: Element) =>
        Array.from(elemento.getElementsByTagNameNS(namespaceWord, "t"))
          .map((nodo) => nodo.textContent || "")
          .join("")
          .replace(/\s+/g, " ")
          .trim();

      const reemplazarPropiedadesParrafo = (
        documentoXml: XMLDocument,
        destino: Element,
        origen: Element
      ) => {
        const propiedadesDestino = primerHijo(destino, "pPr");
        const propiedadesOrigen = primerHijo(origen, "pPr");

        if (propiedadesDestino) {
          destino.removeChild(propiedadesDestino);
        }

        if (propiedadesOrigen) {
          destino.insertBefore(
            propiedadesOrigen.cloneNode(true),
            destino.firstChild
          );
        } else {
          const nuevasPropiedades = documentoXml.createElementNS(
            namespaceWord,
            "w:pPr"
          );
          destino.insertBefore(nuevasPropiedades, destino.firstChild);
        }
      };

      const reemplazarPropiedadesCelda = (
        documentoXml: XMLDocument,
        destino: Element,
        origen: Element
      ) => {
        const propiedadesDestino = primerHijo(destino, "tcPr");
        const propiedadesOrigen = primerHijo(origen, "tcPr");

        if (propiedadesDestino) {
          destino.removeChild(propiedadesDestino);
        }

        if (propiedadesOrigen) {
          destino.insertBefore(
            propiedadesOrigen.cloneNode(true),
            destino.firstChild
          );
        } else {
          const nuevasPropiedades = documentoXml.createElementNS(
            namespaceWord,
            "w:tcPr"
          );
          destino.insertBefore(nuevasPropiedades, destino.firstChild);
        }
      };

      const armonizarBloqueTotales = (documentoXml: XMLDocument) => {
        const tablas = Array.from(
          documentoXml.getElementsByTagNameNS(namespaceWord, "tbl")
        );

        tablas.forEach((tabla) => {
          const filas = obtenerHijos(tabla, "tr");
          const indiceBase = filas.findIndex((fila) =>
            textoElemento(fila).includes("Base Imponible")
          );
          const indiceTotal = filas.findIndex((fila, indice) =>
            indice > indiceBase &&
            textoElemento(fila).replace(/\s+/g, " ").trim().includes("TOTAL")
          );

          if (indiceBase < 0 || indiceTotal < 0) return;

          const filaBase = filas[indiceBase];
          const celdasBase = obtenerHijos(filaBase, "tc");

          for (let indice = indiceBase + 1; indice < indiceTotal; indice += 1) {
            const filaFiscal = filas[indice];
            const celdasFiscal = obtenerHijos(filaFiscal, "tc");

            if (celdasFiscal.length !== celdasBase.length) continue;

            celdasFiscal.forEach((celdaFiscal, indiceCelda) => {
              const celdaBase = celdasBase[indiceCelda];
              if (!celdaBase) return;

              reemplazarPropiedadesCelda(
                documentoXml,
                celdaFiscal,
                celdaBase
              );

              const parrafosFiscal = Array.from(
                celdaFiscal.getElementsByTagNameNS(namespaceWord, "p")
              );
              const parrafosBase = Array.from(
                celdaBase.getElementsByTagNameNS(namespaceWord, "p")
              );

              parrafosFiscal.forEach((parrafoFiscal, indiceParrafo) => {
                const parrafoBase =
                  parrafosBase[indiceParrafo] ||
                  parrafosBase[parrafosBase.length - 1];

                if (parrafoBase) {
                  reemplazarPropiedadesParrafo(
                    documentoXml,
                    parrafoFiscal,
                    parrafoBase
                  );
                }
              });
            });
          }
        });
      };

      const reducirEspacioAntesObservaciones = (documentoXml: XMLDocument) => {
        const parrafos = Array.from(
          documentoXml.getElementsByTagNameNS(namespaceWord, "p")
        );

        const parrafoObservaciones = parrafos.find(
          (parrafo) => textoElemento(parrafo) === "Observaciones"
        );

        if (!parrafoObservaciones) return;

        let propiedades = primerHijo(parrafoObservaciones, "pPr");
        if (!propiedades) {
          propiedades = documentoXml.createElementNS(namespaceWord, "w:pPr");
          parrafoObservaciones.insertBefore(
            propiedades,
            parrafoObservaciones.firstChild
          );
        }

        let espaciado = primerHijo(propiedades, "spacing");
        if (!espaciado) {
          espaciado = documentoXml.createElementNS(namespaceWord, "w:spacing");
          propiedades.appendChild(espaciado);
        }

        espaciado.setAttributeNS(namespaceWord, "w:before", "120");
      };

      const partesWord = Object.keys(doc.getZip().files).filter(
        (ruta) =>
          ruta === "word/document.xml" ||
          /^word\/header\d+\.xml$/.test(ruta) ||
          /^word\/footer\d+\.xml$/.test(ruta)
      );

      partesWord.forEach((ruta) => {
        const archivoXml = doc.getZip().file(ruta);
        if (!archivoXml) return;

        const contenidoXml = archivoXml.asText();
        const documentoXml = new DOMParser().parseFromString(
          contenidoXml,
          "application/xml"
        );

        if (documentoXml.getElementsByTagName("parsererror").length > 0) {
          throw new Error(
            `No se pudo aplicar el formato corporativo a ${ruta}.`
          );
        }

        aplicarColorUniforme(documentoXml);

        if (ruta === "word/document.xml") {
          armonizarBloqueTotales(documentoXml);
          reducirEspacioAntesObservaciones(documentoXml);
        }

        const xmlFinal = new XMLSerializer().serializeToString(documentoXml);
        doc.getZip().file(ruta, xmlFinal);
      });

      const output = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = URL.createObjectURL(output);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `${facturaDocumento.numero_factura || "factura"}.docx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);

      setMensaje(
        `Word de la factura ${facturaDocumento.numero_factura} generado correctamente.`
      );
      setFacturaDocumento(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo generar el Word: ${err.message}`
          : "No se pudo generar el Word."
      );
    } finally {
      setGenerandoWord(false);
    }
  }

  function cambiarOrdenFacturas(clave: ClaveOrdenFactura) {
    setOrdenFacturas((actual) =>
      actual.clave === clave
        ? {
            clave,
            direccion: actual.direccion === "asc" ? "desc" : "asc",
          }
        : { clave, direccion: clave === "fecha" ? "desc" : "asc" }
    );
  }

  function iconoOrden(clave: ClaveOrdenFactura) {
    if (ordenFacturas.clave !== clave) return "↕";
    return ordenFacturas.direccion === "asc" ? "↑" : "↓";
  }

  function toggleFacturaSeleccionada(id: string) {
    setFacturasSeleccionadas((actual) =>
      actual.includes(id)
        ? actual.filter((item) => item !== id)
        : [...actual, id]
    );
  }

  function toggleTodasFacturasVisibles() {
    const idsVisibles = facturasFiltradas.map((factura) => factura.id);

    setFacturasSeleccionadas((actual) => {
      if (todasFacturasVisiblesSeleccionadas) {
        return actual.filter((id) => !idsVisibles.includes(id));
      }

      return [...new Set([...actual, ...idsVisibles])];
    });
  }

  function nombreClienteFactura(factura: FacturaConCliente) {
    return (
      factura.cliente_nombre ||
      (factura.cliente
        ? `${factura.cliente.nombre} ${factura.cliente.apellidos || ""}`.trim()
        : "") ||
      "Cliente"
    );
  }

  function clienteDeFactura(factura: FacturaConCliente) {
    return (
      factura.cliente ||
      clientes.find((cliente) => cliente.id === factura.client_id) ||
      null
    );
  }

  function plantillaParaEnvio(tipo: "whatsapp" | "correo") {
    const candidatas = plantillasMensajes.filter(
      (plantilla) => plantilla.tipo === tipo && plantilla.activa
    );

    return (
      candidatas.find(
        (plantilla) =>
          (plantilla.categoria || "").toLowerCase() === "facturas"
      ) ||
      candidatas.find((plantilla) => plantilla.predeterminada) ||
      candidatas[0] ||
      null
    );
  }

  function rellenarVariablesMensaje(
    texto: string,
    factura: FacturaConCliente
  ) {
    const cliente = clienteDeFactura(factura);
    const valores: Record<string, string> = {
      paciente_nombre: "",
      cliente_nombre: nombreClienteFactura(factura),
      fecha_cita: "",
      hora_cita: "",
      profesional: "",
      servicio: factura.concepto_resumen || "servicios prestados",
      importe: formatearImporte(factura.total),
      factura_numero: factura.numero_factura || "",
      numero_factura: factura.numero_factura || "",
      fecha_vencimiento: factura.fecha_vencimiento
        ? formatearFecha(factura.fecha_vencimiento)
        : "",
      centro_nombre:
        empresa?.nombre_comercial ||
        empresa?.razon_social ||
        "ETHOS Centro para la diversidad",
      centro_telefono: empresa?.telefono || "",
      centro_email: empresa?.email || "",
      cliente_email:
        factura.cliente_email || cliente?.email || "",
      cliente_telefono:
        factura.cliente_telefono ||
        cliente?.movil ||
        cliente?.telefono ||
        "",
    };

    return texto.replace(
      /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
      (_coincidencia, clave: string) => valores[clave] ?? ""
    );
  }

  function registrarEnvioAbierto(facturaId: string) {
    setEnviosAbiertos((actual) =>
      actual.includes(facturaId) ? actual : [...actual, facturaId]
    );
  }

  function enviarFactura(
    factura: FacturaConCliente,
    tipo: "whatsapp" | "correo"
  ) {
    setError("");
    setMensaje("");

    if (factura.estado === "Anulada") {
      setError("Las facturas anuladas no se pueden preparar para envío.");
      return;
    }

    const plantilla = plantillaParaEnvio(tipo);

    if (!plantilla || !plantilla.contenido) {
      setError(
        `No hay una plantilla activa de ${
          tipo === "correo" ? "correo" : "WhatsApp"
        } para Facturas. Revísala en Gestión de Plantillas.`
      );
      return;
    }

    const cliente = clienteDeFactura(factura);
    const cuerpo = rellenarVariablesMensaje(plantilla.contenido, factura);

    if (tipo === "whatsapp") {
      const telefono =
        factura.cliente_telefono ||
        cliente?.movil ||
        cliente?.telefono ||
        "";

      const telefonoLimpio = telefono.replace(/\D/g, "");

      if (!telefonoLimpio) {
        setError(
          `El cliente de la factura ${factura.numero_factura} no tiene teléfono o móvil.`
        );
        return;
      }

      window.open(
        `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(cuerpo)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } else {
      const email =
        factura.cliente_email ||
        cliente?.email ||
        "";

      if (!email) {
        setError(
          `El cliente de la factura ${factura.numero_factura} no tiene correo electrónico.`
        );
        return;
      }

      const asunto = rellenarVariablesMensaje(
        plantilla.asunto || `Factura ${factura.numero_factura}`,
        factura
      );

      window.open(
        `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
          asunto
        )}&body=${encodeURIComponent(cuerpo)}`,
        "_blank"
      );
    }

    registrarEnvioAbierto(factura.id);
  }

  function abrirEnvioBloque(tipo: "whatsapp" | "correo") {
    setError("");
    setMensaje("");
    setEnviosAbiertos([]);

    if (facturasSeleccionadasEnviables.length === 0) {
      setError("Selecciona al menos una factura no anulada.");
      return;
    }

    setTipoEnvioBloque(tipo);
  }

  function exportarPdfsSeleccionados() {
    if (facturasSeleccionadasEnviables.length === 0) {
      setError("Selecciona al menos una factura no anulada para exportar.");
      return;
    }

    setError("");
    setMensaje(
      `Preparando ${facturasSeleccionadasEnviables.length} PDF${
        facturasSeleccionadasEnviables.length === 1 ? "" : "s"
      } con el diseño fiscal correspondiente.`
    );

    facturasSeleccionadasEnviables.forEach((factura) => {
      void generarPdfFactura(factura);
    });
  }

  async function generarPdfFactura(factura: FacturaConCliente) {
    setError("");
    setMensaje("");

    const ventana = window.open("", "_blank");

    if (!ventana) {
      setError(
        "El navegador ha bloqueado la ventana del PDF. Permite ventanas emergentes para este sitio."
      );
      return;
    }

    ventana.document.write(
      "<p style='font-family:Arial;padding:24px'>Preparando factura...</p>"
    );

    try {
      const plantillaAsignada = factura.invoice_template_id
        ? plantillasWord.find((plantilla) => plantilla.id === factura.invoice_template_id)
        : null;

      if (!plantillaAsignada) {
        throw new Error(
          "La factura no tiene disponible su plantilla fiscal asignada. Revisa Gestión de Plantillas."
        );
      }

      const { data, error } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", factura.id)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);

      const lineas = (data || []) as LineaFactura[];
      const patientIds = [
        ...new Set(
          lineas
            .map((linea) => linea.patient_id)
            .filter((valor): valor is string => Boolean(valor))
        ),
      ];

      let pacientesPdf: Paciente[] = [];

      if (patientIds.length > 0) {
        const respuesta = await supabase
          .from("patients")
          .select("id,numero_historia,nombre,apellidos")
          .in("id", patientIds);

        if (respuesta.error) throw new Error(respuesta.error.message);
        pacientesPdf = (respuesta.data || []) as Paciente[];
      }

      const mapaPacientes = new Map(
        pacientesPdf.map((paciente) => [paciente.id, paciente])
      );

      const escapar = (valor: unknown) =>
        String(valor ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      const pacientesUnicos = [
        ...new Set(
          lineas
            .map((linea) => {
              const paciente = linea.patient_id
                ? mapaPacientes.get(linea.patient_id)
                : null;
              return paciente
                ? `${paciente.nombre} ${paciente.apellidos || ""}`.trim()
                : "";
            })
            .filter(Boolean)
        ),
      ];

      const filas = lineas
        .map((linea) => {
          const paciente = linea.patient_id
            ? mapaPacientes.get(linea.patient_id)
            : undefined;
          const pacienteNombre = paciente
            ? `${paciente.nombre} ${paciente.apellidos || ""}`.trim()
            : "";

          return `
            <tr>
              <td class="descripcion">
                <div>${escapar(linea.concepto)}</div>

              </td>
              <td class="num">${escapar(
                Number(linea.cantidad || 1).toLocaleString("es-ES")
              )}</td>
              <td class="num">${escapar(
                formatearImporte(Number(linea.precio_unitario || 0))
              )}</td>
              <td class="num">${escapar(
                formatearImporte(Number(linea.total || 0))
              )}</td>
            </tr>`;
        })
        .join("");

      const nombreEmpresa =
        empresa?.nombre_comercial ||
        empresa?.razon_social ||
        "ETHOS Centro para la diversidad";

      const nombreCliente = nombreClienteFactura(factura);

      const direccionEmpresa = [
        empresa?.direccion,
        [empresa?.codigo_postal, empresa?.localidad].filter(Boolean).join(" "),
        empresa?.provincia,
      ]
        .filter(Boolean)
        .join(", ");

      const direccionCliente = [
        factura.cliente_direccion,
        [factura.cliente_localidad, factura.cliente_codigo_postal]
          .filter(Boolean)
          .join(", "),
        factura.cliente_provincia,
      ]
        .filter(Boolean)
        .join(", ");

      const perfilFiscal = plantillaAsignada.perfil_fiscal || "";
      const esExenta =
        perfilFiscal.startsWith("exento_") || factura.iva_tipo === "exento";
      const esIva21 =
        perfilFiscal.startsWith("iva21_") ||
        (factura.iva_tipo === "sujeto" &&
          Number(factura.iva_porcentaje || 0) === 21);
      const tieneIrpf =
        perfilFiscal.endsWith("_irpf15") ||
        Number(factura.irpf_porcentaje || 0) > 0;

      const filaIva = esExenta
        ? `<div class="total-row">
             <span class="total-label">IVA — Exento</span>
             <strong class="total-value">${escapar(
               formatearImporte(Number(factura.iva_importe || 0))
             )}</strong>
           </div>`
        : esIva21
        ? `<div class="total-row">
             <span class="total-label">IVA (${escapar(
               porcentaje(factura.iva_porcentaje)
             )}%)</span>
             <strong class="total-value">${escapar(
               formatearImporte(Number(factura.iva_importe || 0))
             )}</strong>
           </div>`
        : factura.iva_tipo === "no_sujeto"
        ? `<div class="total-row">
             <span class="total-label">IVA</span>
             <strong class="total-value">No sujeto</strong>
           </div>`
        : `<div class="total-row">
             <span class="total-label">IVA</span>
             <strong class="total-value">${escapar(
               formatearImporte(Number(factura.iva_importe || 0))
             )}</strong>
           </div>`;

      const filaIrpf = tieneIrpf
        ? `<div class="total-row">
             <span class="total-label">IRPF (${escapar(
               porcentaje(factura.irpf_porcentaje)
             )}%)</span>
             <strong class="total-value">−${escapar(
               formatearImporte(Number(factura.irpf_importe || 0))
             )}</strong>
           </div>`
        : "";

      const textoExencion =
        esExenta && factura.iva_exencion_texto
          ? factura.iva_exencion_texto
          : esExenta
          ? "Factura exenta de IVA, según el artículo 20 de la Ley 37/1992."
          : "";

      const ibanTexto = empresa?.iban
        ? `PAGO POR TRANSFERENCIA BANCARIA AL Nº CUENTA: ${empresa.iban}`
        : "";

      const logoEthos = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAARkAAAB9CAMAAACh3OfdAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAJ/UExURQAAAFNapVRdqFFcp1NdqVNcp1Rbp1BYp0RVqlFcqFNbqVRcqVNcplNcpwAAAFRcp1JdplFeplJarVRcqFFcplJbpFNcqFJbqVFXqE5cqlRcqVNdp1JcpkxVoVFaqFVeqjk5ey4teTNmmVNcpzY2a1Rcpz4+eztBdlRcqFRapzMxeTIyeTIyejU0eTY0ei4teEBAgE9Ypzo6dEREfDs7eTU1eDAvelNdqDc3eTU1e0BAe1Ndp1NcpzY2eT4+ejAveFNdpzw8ezMzZi4teU5isT09eVVVqjs9ey4teVJaqTc6djs7ezU1eVFcpzs7ejo6e0BAeDw8eDs+elNcqEBAfT09ezAveTo6dzAwcEREfjMxeDIyeFFZpkBAflFdqFRdqFNcp1Jbp1JcplNdqFNbp1Bcp0NDey8teTY2eS0sdzk5eENDeUlbpDg4djU3eTQ0eVJcpz09elNcqFJdpzw8ezc1eTY2ei0teTMzczIyeT8/ejY2ej4+ezs7eysreDExdzk5eFRbqFBapTY2eTEveDExeDg4fTQ0ey4tdzExdy4teC8ueTs7ekZGfTs7eT09fC8ueTY2fDs7eEdHfkBCezU1eysrVUBAgDw8fDAweVNbpjs7eUREgEFBe0REgC0reS8ueTMzZjY6eiQkbT4+ezk5ezU1ezo6fEFBfC8ueFRcqFNdqDg5ejk5eDY2ekdJgC4udDs7fC8ueSsrai8udzEzdzMzZjMzdTc3eTY2eDo6dzU1dzIydzUzeFNcpzU1eAAAVTMzgDg3ezExez5AezAwdwAAgCsrgDk5cQAAZkREdz0+fC0teFNapVNcqFVVqlNcp05Yp1VVqlNdqFNcqLLvHWcAAADVdFJOUwAl/6mU7rcgD7xcsfLKAT2nPB/ORTiWOyYnq/anG088y/8FzRNAiyfluu3s7O3s/QQdFs165PzxKvK3kf61gPGU0w/+DT8Mgfw+YWjSpla6JCKsbIvQ+qsQR9TTOXMsxZlRmLOXQLT0y96yEw4pzdtLp2/tctJa8BR2rfPkz7A+VUkwxuri1fr9cv79gjNOgvL4pGtwxwbOb/y7pGxyvmX+BUsHfDYdwKT4W+KlbEtsC738DN2rCiO5Wa8+vtrs5gMK+ZGgOgIMCQUPoBEitQb1Gg/McuqI7BIAAAAJcEhZcwAAIdUAACHVAQSctJ0AAAdCSURBVHhe7Z31lxRHFIVrhwjZJCQhruQRVwhxF+LuIS4kgbi7EBeIu7u7u7srf1BOVXXJu13V3TOnZgg99f2wvX3frVf97vZs7wBnESKTyWQymUwmk8lkMplMJtMDIyOdzpgRVIeaBTolFkTPEIKZOBZC6zCBYSDoHxIWxhyC4Kr2MxYjiIIrWw6OXwWubTM4u2SRUVkZHUVdgutbS/3g6FgUDa2Ez7wYlg2Lcx+WWwibdxxWGcyKxdbR3bDduedrvEmXwFqQYYmmhzmXdEuWwlp7iOcy3pXGYy2+qj1ERnSj19S53CZCE9qxAd+zdEBrF+UBvShKeLZlSkrbgPmW5VEgyznn8vLcnbYdTKIMrhgSMIYQuGYo4BGsENFXZGuGAn/8qtpKWGw73uxYktSU20zt4NYwBistpy4YIVYe6mRWQZlRl11LkUOviiIgPauhmMlkMpnUTJDfbyegWmZ10qDeB4qdOHV1R8jpaVW6ZWLxs4tiIlZ9bKuKbsnwN7PU1R0hp6dV6QVr+Lko0GGxnRRrYjkxfLeCuroj5PS0Kl2DsUjWQpPGNipYGw1pwe0UdXVHyOlpVboEMzGgT2L7WNZBS1JwN0Vd3RFyelqVXhFMKBrbxgM9ScHNFHV1R8jpaVV6VTCBaGwbHzSlBPdS1NUdIaenVeliXUyDAWbbhQOulOBWirq6I+T0tCq98pbpdNbjZtuFwT1pMXusv4FjQ6++kcNez8ZOC3TCy43pGAXC3azLpHDHtJgNJ2OhDLu4MrFyRN8EkyjB7KbJFHW2aaBhasyOA08GcyjjuzeDJpsTbeHX+4DZ8X+YzJaeeyvTZOtCoG28al8wOw46GYyhs21Z8v3hLv3EbJgwmRjMHQxhu5Co8Rtt7xf6hr+jBU2apuUYzB3OIKxKsFnkIhKCGyrQpGlajsHckQiY7EezA3ajHb1qP8D9FGjSNC3HYO5IAkyuvmli15EK3E2BJk3TcgzmjiSwU0QP9t+Z1VODuynQpGlajsHckQQqktkF+8UuJBG4mQJNmqblGMwdSYDJPJnADlPBkBTcTIEmTdNyDOaORMDUXdkKIcRulS0Tg3sp0KRpWo7B3CyCBk9tS7xlYsweCX/Sa6TzDHQKuwe0EHvYlntiKSFmj0EnsxekEIItYIR7psVsMehkSjdNGe4XQuxN+xSfRXomxWwxHySzr+sR6ZkUs8XAk6mNZj/w6yb7y08PiPVMid3DB02aHssxHZNAwG7bHHiQ/ZQOBlNK3C4eaNL0WI7pNdGA2XZhgCkpuJcCTZoeyzG9OppDwGu7MMCUFNxLgSZNj+WYXh0NWg+1bTzQlBTcTIEmTY/lmC7BPAz+HwEXHGb7WA5HT1JwNwWaND2WY7oCI9GgS3GEbVTVMB24mwJNmh7LMV2DoUjQUzDNdqrolw7YTYMmTY/lmG5omIvEtiKiI7GYGn8zC5o0NeWjji4A3cioe7hYjsESYC7hWCxkMplMphk1zyCF9ByHYtvRz6GxKDNqH+GtpHhER39lkfcgR73lmLGjcx9f62gpdu7OCVhSuPqJWGo5J7nRO9OxyN4uYK31nOxP3znFq7BCwmBORaFnAm+OZswU4jQULacXR1hIZ/DzgjN5AhFwVa+cVfF2r2sCfWacHZQL6JziCHI4Gbw5QpyLS3pGXROdF5S7JrBKJlNPPJnz+V1wASYBeFY47RYdjPx4obp1SL5l12/c9Yn69CJtvvgSIrpUCHGZvs/ociIx2bvnipV2ziuISN8zqiLElURXCUFXU7EPzXIrrimO8mCTuVbN6z9sMAuf60o+T+gS98WS13m9juKGQr9RXehNQtDNhecWVbm1mFMP4nWR2mx3Oofsq4luk4fbdUZ2nUqmOLnDNJUNbDJmZnPua4jvMSamdYVNhu4U4q67Bd0jxL3F11jc5yZwbrrfSvSAEPQgJMNPTTLTSMx+yBRdS5olHpb/rNsTlaeUDB9xupUdzPBIUO0Kl0zxAnlUiMfMdT5OQjyByTz5lBviaX/KymTkK9Ntoqv0jEyGnm2UTGlGVyn/PVN8VXPoOXV4XtAL+hyTYaOr8xfdEDKZl6qTeZkl43R9lMnMcQttA/cd2A35itXqcGtexVIX0GvyA4nXSYgpb6hk3pTX95aYVCTzthD0TmEW4l0S4j315dfJqGH8ZN4XH9hTeT5TD/shfSTEVBLiY33+iU7mU9vgM9P0c/7UdmM2vAG8BV9grSvkDS5f6l8S0VcqmeKJ9LVORhq+8bzF8Vv5eJHJfOf9QKQX0vfunMapx9AP5p6wr6Yfiegn8TOR+MW8xoh+LY6/2azhZePUGL93Z0+Fd70DxJ+1Ztg/fOufWO0j8yYZeExj1dHU1wfmUTLiLz5z5280lGIZcDDzEJy70+n8U1Vki9sNjl4Nrm43OH0cXNl+MIEwuGo4+BdjKIErhgiMwqf6P0MYAtQvRS6BruFlrs1kLpYymUwmk8lkMhnNf3Bp9aQVPeItAAAAAElFTkSuQmCC";

      ventana.document.open();
      ventana.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapar(factura.numero_factura)}</title>
<style>
  @page { size: A4; margin: 14mm 15mm 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #17365d;
    font-size: 12px;
    background: #fff;
  }
  .page { width: 100%; }
  .header {
    display: grid;
    grid-template-columns: 190px 1fr;
    align-items: start;
    gap: 34px;
    margin-bottom: 42px;
  }
  .logo {
    width: 145px;
    height: auto;
    display: block;
    margin: 2px 0 0 5px;
  }
  .invoice-box {
    justify-self: end;
    width: 325px;
    border: 1.5px solid #17365d;
    padding: 9px 10px;
    font-size: 13px;
    line-height: 1.45;
  }
  .invoice-number { font-weight: 700; }
  .parties {
    border: 1.5px solid #17365d;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 26px;
    padding: 9px 10px 11px;
    margin-bottom: 32px;
    line-height: 1.45;
  }
  .party-title { font-weight: 700; margin-bottom: 2px; }
  .party-name { font-weight: 700; }
  h2 {
    margin: 0 0 18px 8px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 18px;
    color: #17365d;
  }
  .patient-summary {
    min-height: 44px;
    margin: 0 8px 18px;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 13px;
    font-weight: 700;
  }
  table.details {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    color: #17365d;
  }
  .details th {
    padding: 9px 8px 10px;
    text-align: left;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
    border-bottom: 0;
  }
  .details th.num, .details td.num { text-align: right; }
  .details td {
    padding: 8px;
    vertical-align: top;
    border-bottom: 1px solid #d7dfeb;
  }
  .details td.descripcion { width: 46%; }
  .paciente-linea {
    margin-top: 3px;
    font-size: 10.5px;
    color: #5a6f8d;
  }
  .totals {
    width: 100%;
    border: 1.5px solid #17365d;
    margin-top: 26px;
  }
  .totals-title {
    padding: 5px 8px;
    border-bottom: 1px solid #17365d;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 16px;
    font-weight: 700;
  }
  .total-row {
    display: grid;
    grid-template-columns: 1fr 175px;
    min-height: 31px;
    border-bottom: 1px solid #17365d;
  }
  .total-row:last-child { border-bottom: 0; }
  .total-label {
    padding: 6px 10px;
    text-align: right;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
    font-weight: 700;
  }
  .total-value {
    padding: 6px 10px;
    border-left: 1px solid #17365d;
    text-align: right;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
  }
  .grand .total-label,
  .grand .total-value {
    font-size: 15px;
    font-weight: 800;
  }
  .paid {
    margin-top: 16px;
    text-align: right;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: 1px;
  }
  .observations {
    margin-top: 34px;
    page-break-inside: avoid;
  }
  .observations h3 {
    margin: 0;
    padding: 0 8px 4px;
    border-bottom: 2px solid #17365d;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 17px;
  }
  .observation-text {
    padding: 14px 0 0;
    color: #17365d;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 10.5px;
    line-height: 1.5;
  }
  .observation-text p { margin: 0 0 12px; }
  .fiscal-note {
    text-align: left;
    font-weight: 700;
  }
  .template-ref {
    margin-top: 14px;
    text-align: right;
    font-size: 8px;
    color: #8a98aa;
  }
  .actions { margin-top: 24px; text-align: center; }
  .actions button {
    padding: 10px 18px;
    border: 1px solid #17365d;
    background: white;
    color: #17365d;
    font-weight: 700;
    cursor: pointer;
  }
  @media print {
    .actions, .template-ref { display: none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <img class="logo" src="${logoEthos}" alt="ETHOS Centro para la diversidad">
    <div class="invoice-box">
      <div>Nº Factura: <span class="invoice-number">${escapar(
        factura.numero_factura
      )}</span></div>
      <div>Fecha: ${escapar(formatearFecha(factura.fecha))}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-title">DE:</div>
      <div class="party-name">${escapar(nombreEmpresa)}</div>
      ${empresa?.nif_cif ? `<div>${escapar(empresa.nif_cif)}</div>` : ""}
      ${direccionEmpresa ? `<div>${escapar(direccionEmpresa)}</div>` : ""}
    </div>
    <div>
      <div class="party-title">PARA:</div>
      <div class="party-name">${escapar(nombreCliente)}</div>
      ${
        factura.cliente_nif_cif
          ? `<div>${escapar(factura.cliente_nif_cif)}</div>`
          : ""
      }
      ${direccionCliente ? `<div>${escapar(direccionCliente)}</div>` : ""}
    </div>
  </div>

  <h2>Detalles</h2>
  ${
    pacientesUnicos.length > 0
      ? `<div class="patient-summary">${escapar(pacientesUnicos.join(", "))}</div>`
      : '<div class="patient-summary"></div>'
  }

  <table class="details">
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="num">Unidades</th>
        <th class="num">Precio</th>
        <th class="num">Importe</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="totals">
    <div class="totals-title">Total</div>
    <div class="total-row">
      <span class="total-label">Base Imponible</span>
      <strong class="total-value">${escapar(
        formatearImporte(factura.base_imponible ?? factura.subtotal)
      )}</strong>
    </div>
    ${filaIva}
    ${filaIrpf}
    <div class="total-row grand">
      <span class="total-label">TOTAL</span>
      <strong class="total-value">${escapar(
        formatearImporte(factura.total)
      )}</strong>
    </div>
  </div>

  ${
    factura.mostrar_pagado
      ? '<div class="paid">PAGADO</div>'
      : ""
  }

  <div class="observations">
    <h3>Observaciones</h3>
    <div class="observation-text">
      ${ibanTexto ? `<p>${escapar(ibanTexto)}</p>` : ""}
      ${
        textoExencion
          ? `<p class="fiscal-note">${escapar(textoExencion)}</p>`
          : ""
      }
      ${
        factura.observaciones
          ? `<p>${escapar(factura.observaciones)}</p>`
          : ""
      }
      <p>
        Tratamos sus datos en base a la existencia de un contrato, precontrato o relación comercial entre ambas partes.
        Cumplimos con la normativa de Protección de Datos, habiendo adoptado las medidas de seguridad técnicas y
        organizativas oportunas para garantizar la privacidad de sus datos y creando procedimientos para atender sus derechos.
      </p>
    </div>
  </div>

  <div class="template-ref">
    Plantilla fiscal: ${escapar(
      plantillaAsignada.nombre
    )} · ${escapar(perfilFiscal)}
  </div>

  <div class="actions">
    <button onclick="window.print()">Guardar / imprimir como PDF</button>
  </div>
</div>

<script>
  const logo = document.querySelector(".logo");
  const imprimir = function () {
    setTimeout(function () { window.print(); }, 250);
  };
  if (logo && !logo.complete) {
    logo.addEventListener("load", imprimir, { once: true });
    logo.addEventListener("error", imprimir, { once: true });
  } else {
    imprimir();
  }
<\/script>
</body>
</html>`);
      ventana.document.close();
    } catch (err) {
      ventana.close();
      setError(
        err instanceof Error
          ? `No se pudo preparar el PDF: ${err.message}`
          : "No se pudo preparar el PDF."
      );
    }
  }

  async function abrirFactura(
    factura: FacturaConCliente
  ) {
    setFacturaDetalle(factura);
    setCargandoDetalle(true);
    setLineasDetalle([]);
    setError("");

    try {
      const { data, error } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", factura.id)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      setLineasDetalle(
        (data || []) as LineaFactura[]
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la factura."
      );
    } finally {
      setCargandoDetalle(false);
    }
  }

  async function cambiarEstadoFactura(
    factura: FacturaConCliente,
    nuevoEstado: string
  ) {
    setError("");
    setMensaje("");

    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", factura.id);

      if (error) {
        throw new Error(error.message);
      }

      setMensaje(
        "Estado de factura actualizado."
      );

      await cargarFacturas();

      if (facturaDetalle?.id === factura.id) {
        setFacturaDetalle((actual) =>
          actual
            ? {
                ...actual,
                estado: nuevoEstado,
              }
            : null
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar la factura."
      );
    }
  }

  async function eliminarFactura(
    factura: FacturaConCliente
  ) {
    if (eliminandoFacturaId) return;

    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar la factura ${factura.numero_factura}?\n\nSus cobros volverán a Pendientes de facturar. El contador automático NO retrocederá.`
    );

    if (!confirmar) return;

    setEliminandoFacturaId(factura.id);
    setError("");
    setMensaje("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "eliminar_factura_y_liberar_cobros",
        {
          p_invoice_id: factura.id,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (facturaDetalle?.id === factura.id) {
        setFacturaDetalle(null);
        setLineasDetalle([]);
      }

      setMensaje(
        `Factura ${factura.numero_factura} eliminada. Sus cobros vuelven a estar pendientes de facturar.`
      );

      setSeleccionados([]);
      setFacturasSeleccionadas((actual) =>
        actual.filter((id) => id !== factura.id)
      );

      await Promise.all([
        cargarCobros(),
        cargarFacturas(),
        cargarSecuencias(),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo eliminar la factura: ${err.message}`
          : "No se pudo eliminar la factura."
      );
    } finally {
      setEliminandoFacturaId(null);
    }
  }

  const clienteFacturaSeleccionado = clienteSeleccionadoId
    ? clientes.find((item) => item.id === clienteSeleccionadoId) || null
    : null;

  const fiscalidadSeleccionada = clienteFacturaSeleccionado
    ? calcularFiscalidad(Number((baseFacturaEdit || String(totalSeleccionado)).replace(",", ".")) || 0, clienteFacturaSeleccionado)
    : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="min-w-0 flex-1 p-8">
          <header className="mb-7">
            <p className="text-sm text-slate-500">
              Gestión económica
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Facturación
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Series independientes por año y etiqueta A, B o C.
            </p>
          </header>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {mensaje && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">
              {mensaje}
            </div>
          )}

          <div className="mb-6 flex gap-2">
            <Pestana
              label="Pendientes de facturar"
              activa={pestana === "pendientes"}
              onClick={() => setPestana("pendientes")}
            />

            <Pestana
              label="Facturas"
              activa={pestana === "facturas"}
              onClick={() => setPestana("facturas")}
            />
          </div>

          {pestana === "pendientes" && (
            <>
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <input
                    value={busqueda}
                    onChange={(event) =>
                      setBusqueda(event.target.value)
                    }
                    placeholder="Buscar paciente, cliente, servicio..."
                    className="rounded-xl border border-slate-300 px-4 py-3"
                  />

                  <select
                    value={filtroCliente}
                    onChange={(event) =>
                      setFiltroCliente(event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Todos los clientes
                    </option>

                    {clientes.map((cliente) => (
                      <option
                        key={cliente.id}
                        value={cliente.id}
                      >
                        {cliente.nombre} {cliente.apellidos || ""}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroPaciente}
                    onChange={(event) =>
                      setFiltroPaciente(event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Todos los pacientes
                    </option>

                    {pacientes.map((paciente) => (
                      <option
                        key={paciente.id}
                        value={paciente.id}
                      >
                        {paciente.nombre} {paciente.apellidos}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroServicio}
                    onChange={(event) =>
                      setFiltroServicio(event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Todos los servicios
                    </option>

                    {servicios.map((servicio) => (
                      <option
                        key={servicio.id}
                        value={servicio.id}
                      >
                        {servicio.nombre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filtroEtiqueta}
                    onChange={(event) =>
                      setFiltroEtiqueta(event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Todas las etiquetas
                    </option>

                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>

                  <select
                    value={rango}
                    onChange={(event) =>
                      setRango(event.target.value as Rango)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="todos">
                      Todas las fechas
                    </option>

                    <option value="esteMes">
                      Este mes
                    </option>

                    <option value="mesAnterior">
                      Mes anterior
                    </option>

                    <option value="ultimos30">
                      Últimos 30 días
                    </option>

                    <option value="ultimos3Meses">
                      Últimos 3 meses
                    </option>

                    <option value="esteAno">
                      Este año
                    </option>

                    <option value="personalizado">
                      Personalizado
                    </option>
                  </select>
                </div>

                {rango === "personalizado" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Campo
                      label="Desde"
                      type="date"
                      value={fechaDesde}
                      onChange={setFechaDesde}
                    />

                    <Campo
                      label="Hasta"
                      type="date"
                      value={fechaHasta}
                      onChange={setFechaHasta}
                    />
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-5">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Cobros pendientes de facturar
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Puedes generar una factura individual o facturar en bloque. En bloque, el sistema agrupa automáticamente por cliente + A/B/C.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={prepararFactura}
                      disabled={seleccionados.length === 0}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold disabled:opacity-40"
                    >
                      Generar factura
                    </button>

                    <button
                      type="button"
                      onClick={prepararFacturacionBloque}
                      disabled={seleccionados.length === 0}
                      className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-40"
                    >
                      Facturar en bloque
                    </button>
                  </div>
                </div>

                {cargando ? (
                  <p className="p-8 text-center text-slate-500">
                    Cargando...
                  </p>
                ) : cobrosFiltrados.length === 0 ? (
                  <p className="p-8 text-center text-slate-500">
                    No hay cobros pendientes de facturar.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1750px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={
                                cobrosFiltrados.length > 0 &&
                                cobrosFiltrados.every((item) =>
                                  seleccionados.includes(item.id)
                                )
                              }
                              onChange={seleccionarTodosVisibles}
                            />
                          </th>

                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Paciente</th>
                          <th className="px-4 py-3">Servicio</th>
                          <th className="px-4 py-3">Concepto</th>
                          <th className="px-4 py-3">Etiqueta</th>
                          <th className="px-4 py-3 text-right">Base</th>
                          <th className="px-4 py-3 text-right">IVA</th>
                          <th className="px-4 py-3 text-right">IRPF</th>
                          <th className="px-4 py-3 text-right">Total factura est.</th>
                          <th className="px-4 py-3">Estado</th>
                        </tr>
                      </thead>

                      <tbody>
                        {cobrosFiltrados.map((cobro) => (
                          <tr
                            key={cobro.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={seleccionados.includes(cobro.id)}
                                onChange={() =>
                                  alternarSeleccion(cobro.id)
                                }
                              />
                            </td>

                            <td className="px-4 py-4">
                              {formatearFecha(cobro.fecha)}
                            </td>

                            <td className="px-4 py-4">
                              {cobro.cliente
                                ? `${cobro.cliente.nombre} ${cobro.cliente.apellidos || ""}`
                                : "—"}
                            </td>

                            <td className="px-4 py-4 font-medium">
                              {cobro.paciente
                                ? `${cobro.paciente.nombre} ${cobro.paciente.apellidos}`
                                : "—"}
                            </td>

                            <td className="px-4 py-4">
                              {cobro.servicio?.nombre || "—"}
                            </td>

                            <td className="px-4 py-4">
                              {cobro.concepto}
                            </td>

                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">
                                {cobro.concepto_codigo || "—"}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-right font-semibold">{formatearImporte(cobro.importe)}</td>
                            <td className="px-4 py-4 text-right">{cobro.cliente && cobro.cliente.iva_tipo && cobro.cliente.iva_tipo !== "pendiente" ? formatearImporte(calcularFiscalidad(cobro.importe, cobro.cliente).ivaImporte) : "—"}</td>
                            <td className="px-4 py-4 text-right">{cobro.cliente && cobro.cliente.iva_tipo && cobro.cliente.iva_tipo !== "pendiente" ? `−${formatearImporte(calcularFiscalidad(cobro.importe, cobro.cliente).irpfImporte)}` : "—"}</td>
                            <td className="px-4 py-4 text-right font-bold">{cobro.cliente && cobro.cliente.iva_tipo && cobro.cliente.iva_tipo !== "pendiente" ? formatearImporte(calcularFiscalidad(cobro.importe, cobro.cliente).total) : "Pendiente"}</td>

                            <td className="px-4 py-4">
                              {cobro.estado}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap gap-6 border-t border-slate-200 bg-slate-50 px-5 py-4">
                  <span>
                    Seleccionados:{" "}
                    <strong>{seleccionados.length}</strong>
                  </span>

                  <span>
                    Total seleccionado:{" "}
                    <strong>
                      {formatearImporte(totalSeleccionado)}
                    </strong>
                  </span>

                  {cobrosSeleccionados.length > 0 && (
                    <>
                      <span>
                        Cliente:{" "}
                        <strong>
                          {clienteSeleccionadoId
                            ? "Correcto"
                            : "Mezcla de clientes"}
                        </strong>
                      </span>

                      <span>
                        Etiqueta:{" "}
                        <strong>
                          {etiquetaSeleccionada || "Mezcla A/B/C"}
                        </strong>
                      </span>
                    </>
                  )}

                  {seleccionados.length > 0 &&
                    !seleccionValida && (
                      <span className="font-medium text-amber-700">
                        La selección no puede generar una sola factura, pero sí puede facturarse en bloque.
                      </span>
                    )}
                </div>
              </section>

              {mostrarBloque && (
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold">
                      Facturación en bloque
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Revisa cómo se agruparán los cobros antes de generar las facturas.
                    </p>
                  </div>

                  <div className="mb-6 grid gap-5 md:grid-cols-3">
                    <Campo
                      label="Fecha de las facturas"
                      type="date"
                      value={fechaFactura}
                      onChange={setFechaFactura}
                    />

                    <Campo
                      label="Fecha de vencimiento"
                      type="date"
                      value={fechaVencimientoFactura}
                      onChange={setFechaVencimientoFactura}
                    />

                    <Dato
                      titulo="Facturas que se generarán"
                      valor={String(gruposFacturacionBloque.length)}
                    />
                  </div>

                  <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium">
                      Observaciones para el lote
                    </label>

                    <textarea
                      value={observacionesFactura}
                      onChange={(event) =>
                        setObservacionesFactura(event.target.value)
                      }
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    />
                  </div>

                  {incidenciasBloque.length > 0 && (
                    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
                      <p className="font-semibold">
                        Hay {incidenciasBloque.length} cobro
                        {incidenciasBloque.length === 1 ? "" : "s"} con incidencias.
                      </p>

                      <p className="mt-1 text-sm">
                        Deben tener cliente de facturación y etiqueta A, B o C antes de poder facturar el lote.
                      </p>
                    </div>
                  )}

                  {clientesFiscalidadPendienteBloque.length > 0 && (
                    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
                      <p className="font-semibold">Fiscalidad pendiente de configurar.</p>
                      <p className="mt-1 text-sm">
                        Revisa Cliente → Económico en: {clientesFiscalidadPendienteBloque.map((cliente) => `${cliente.nombre} ${cliente.apellidos || ""}`.trim()).join(", ")}.
                      </p>
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[1650px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-4 py-3">Factura propuesta (editable)</th>
                          <th className="px-4 py-3">Cliente pagador</th>
                          <th className="px-4 py-3">Paciente</th>
                          <th className="px-4 py-3">Plantilla automática</th>
                          <th className="px-4 py-3">Concepto / resumen (editable)</th>
                          <th className="px-4 py-3">Serie</th>
                          <th className="px-4 py-3 text-right">Cobros</th>
                          <th className="px-4 py-3 text-right">Base (editable)</th>
                          <th className="px-4 py-3 text-right">IVA</th>
                          <th className="px-4 py-3 text-right">IRPF</th>
                          <th className="px-4 py-3 text-right">Total factura</th>
                        </tr>
                      </thead>

                      <tbody>
                        {gruposFacturacionBloque.map((grupo) => (
                          <tr
                            key={grupo.clave}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-4"><input className="w-44 rounded-lg border border-slate-300 px-3 py-2 font-semibold" value={edicionesBloque[grupo.clave]?.numero ?? grupo.numeroPropuesto} onChange={(e) => setEdicionesBloque((a) => ({...a, [grupo.clave]: { numero: e.target.value, concepto: a[grupo.clave]?.concepto ?? grupo.conceptoPropuesto, base: a[grupo.clave]?.base ?? String(grupo.total) }}))} /></td>
                            <td className="px-4 py-4">{grupo.clienteNombre}</td>
                            <td className="px-4 py-4 font-medium">{grupo.pacienteNombre}</td>
                            <td className="px-4 py-4">{(() => { const c=clientes.find(x=>x.id===grupo.client_id); const p=c ? plantillaFiscalAutomatica(c,plantillasWord) : null; return p?.nombre || "Sin plantilla"; })()}</td>
                            <td className="px-4 py-4"><input className="min-w-64 rounded-lg border border-slate-300 px-3 py-2" value={edicionesBloque[grupo.clave]?.concepto ?? grupo.conceptoPropuesto} onChange={(e) => setEdicionesBloque((a) => ({...a, [grupo.clave]: { numero: a[grupo.clave]?.numero ?? grupo.numeroPropuesto, concepto: e.target.value, base: a[grupo.clave]?.base ?? String(grupo.total) }}))} /></td>

                            <td className="px-4 py-4">
                              {`${fechaFactura.slice(0, 4)}-${grupo.etiqueta}`}
                            </td>

                            <td className="px-4 py-4 text-right">
                              {grupo.numeroCobros}
                            </td>

                            <td className="px-4 py-4 text-right"><input type="number" step="0.01" min="0" className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-right font-semibold" value={edicionesBloque[grupo.clave]?.base ?? String(grupo.total)} onChange={(e) => setEdicionesBloque((a) => ({...a, [grupo.clave]: { numero: a[grupo.clave]?.numero ?? grupo.numeroPropuesto, concepto: a[grupo.clave]?.concepto ?? grupo.conceptoPropuesto, base: e.target.value }}))} /></td>
                            {(() => { const cliente=clientes.find(x=>x.id===grupo.client_id); const base=Number((edicionesBloque[grupo.clave]?.base ?? String(grupo.total)).replace(",",".")); if(!cliente || !cliente.iva_tipo || cliente.iva_tipo==="pendiente" || !Number.isFinite(base)) return <><td className="px-4 py-4 text-right">—</td><td className="px-4 py-4 text-right">—</td><td className="px-4 py-4 text-right">—</td></>; const f=calcularFiscalidad(base,cliente); return <><td className="px-4 py-4 text-right">{formatearImporte(f.ivaImporte)}</td><td className="px-4 py-4 text-right">−{formatearImporte(f.irpfImporte)}</td><td className="px-4 py-4 text-right font-bold">{formatearImporte(f.total)}</td></>; })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-5">
                    <div className="flex flex-wrap gap-6">
                      <span>
                        Cobros seleccionados:{" "}
                        <strong>{cobrosSeleccionados.length}</strong>
                      </span>

                      <span>
                        Facturas:{" "}
                        <strong>{gruposFacturacionBloque.length}</strong>
                      </span>

                      <span>
                        Base lote:{" "}
                        <strong>{formatearImporte(totalBloque)}</strong>
                      </span>

                      <span>
                        Total fiscal:{" "}
                        <strong>{formatearImporte(totalBloqueFiscal)}</strong>
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setMostrarBloque(false);
                          limpiarPreparacionFactura();
                        }}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-3"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        onClick={generarFacturacionBloque}
                        disabled={
                          generandoBloque ||
                          incidenciasBloque.length > 0 ||
                          clientesFiscalidadPendienteBloque.length > 0 ||
                          gruposFacturacionBloque.length === 0
                        }
                        className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
                      >
                        {generandoBloque
                          ? "Generando..."
                          : `Generar ${gruposFacturacionBloque.length} factura${gruposFacturacionBloque.length === 1 ? "" : "s"}`}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {mostrarGenerar && (
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="mb-5 text-xl font-semibold">
                    Generar factura
                  </h2>

                  <div className="mb-5 grid gap-4 md:grid-cols-3">
                    <Dato
                      titulo="Serie"
                      valor={seriePrevista || "—"}
                    />

                    <Dato
                      titulo="Etiqueta"
                      valor={etiquetaSeleccionada || "—"}
                    />

                    <div><label className="mb-2 block text-sm font-medium">Base editable</label><input type="number" min="0" step="0.01" value={baseFacturaEdit || String(totalSeleccionado)} onChange={(e)=>setBaseFacturaEdit(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold" /></div>
                  </div>

                  {clienteFacturaSeleccionado && fiscalidadSeleccionada && (
                    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <div className="grid gap-4 md:grid-cols-4">
                        <Dato titulo="IVA" valor={descripcionIva(clienteFacturaSeleccionado)} />
                        <Dato titulo="Importe IVA" valor={formatearImporte(fiscalidadSeleccionada.ivaImporte)} />
                        <Dato titulo="IRPF" valor={`${porcentaje(clienteFacturaSeleccionado.irpf_porcentaje)} %`} />
                        <Dato titulo="Total factura" valor={formatearImporte(fiscalidadSeleccionada.total)} />
                      </div>
                      {clienteFacturaSeleccionado.iva_tipo === "pendiente" && (
                        <p className="mt-4 font-medium text-amber-700">
                          Este cliente tiene la fiscalidad pendiente de configurar. Edita Cliente → Económico antes de generar la factura.
                        </p>
                      )}
                      {clienteFacturaSeleccionado.face_requiere && (
                        <p className="mt-4 font-medium text-blue-700">
                          Cliente FACe: la factura conservará también los datos DIR3 configurados en su ficha.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <Campo
                      label="Fecha factura"
                      type="date"
                      value={fechaFactura}
                      onChange={setFechaFactura}
                    />

                    <Campo
                      label="Fecha vencimiento"
                      type="date"
                      value={fechaVencimientoFactura}
                      onChange={setFechaVencimientoFactura}
                    />

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Numeración propuesta
                      </label>

                      <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
                        <p className="font-semibold">
                          {numeroAutomaticoPropuesto || "—"}
                        </p>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Este es el siguiente número automático que corresponde a la serie.
                      </p>
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                      <input
                        type="checkbox"
                        checked={usarNumeroManual}
                        onChange={(event) => {
                          setUsarNumeroManual(event.target.checked);

                          if (!event.target.checked) {
                            setNumeroManual("");
                          }
                        }}
                      />

                      <span>
                        <span className="block font-medium">
                          Usar número manual
                        </span>

                        <span className="mt-1 block text-xs text-slate-500">
                          Solo si necesitas recuperar o asignar un número concreto.
                        </span>
                      </span>
                    </label>

                    {usarNumeroManual && (
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Número manual
                        </label>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={numeroManual}
                          onChange={(event) => {
                            const valor = event.target.value;

                            if (
                              valor === "" ||
                              /^\d+$/.test(valor)
                            ) {
                              setNumeroManual(valor);
                            }
                          }}
                          placeholder="Ej. 7"
                          className="w-full rounded-xl border border-slate-300 px-4 py-3"
                        />

                        <p className="mt-1 text-xs text-slate-500">
                          {numeroManualCompleto
                            ? `Se creará: ${numeroManualCompleto}`
                            : `Introduce el número que quieras usar dentro de ${seriePrevista || "la serie"}.`}
                        </p>
                      </div>
                    )}

                    <div className="md:col-span-2 xl:col-span-3"><label className="mb-2 block text-sm font-medium">Concepto / resumen de factura</label><input value={conceptoFactura} onChange={(e)=>setConceptoFactura(e.target.value)} placeholder={cobrosSeleccionados.map(c=>c.concepto).filter(Boolean).join(" / ")} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></div>

                    <div className="md:col-span-2 xl:col-span-3">
                      <label className="mb-2 block text-sm font-medium">
                        Observaciones
                      </label>

                      <textarea
                        value={observacionesFactura}
                        onChange={(event) =>
                          setObservacionesFactura(event.target.value)
                        }
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3"
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">
                      Número de factura
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {usarNumeroManual
                        ? numeroManualCompleto || "Pendiente de completar"
                        : numeroAutomaticoPropuesto || "—"}
                    </p>
                  </div>

                  <div className="mt-5 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarGenerar(false);
                        limpiarPreparacionFactura();
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={generando || clienteFacturaSeleccionado?.iva_tipo === "pendiente"}
                      onClick={generarFactura}
                      className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
                    >
                      {generando
                        ? "Generando..."
                        : "Generar factura"}
                    </button>
                  </div>
                </section>
              )}
            </>
          )}

          {pestana === "facturas" && (
            <>
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    value={busquedaFacturas}
                    onChange={(event) =>
                      setBusquedaFacturas(event.target.value)
                    }
                    placeholder="Buscar nº factura, cliente..."
                    className="rounded-xl border border-slate-300 px-4 py-3"
                  />

                  <select
                    value={filtroSerieFactura}
                    onChange={(event) =>
                      setFiltroSerieFactura(event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Todas las series
                    </option>

                    <option value="A">Serie A</option>
                    <option value="B">Serie B</option>
                    <option value="C">Serie C</option>
                  </select>

                  <select
                    value={filtroEstadoFactura}
                    onChange={(event) =>
                      setFiltroEstadoFactura(event.target.value)
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                  >
                    <option value="">
                      Todos los estados
                    </option>

                    <option value="Borrador">Borrador</option>
                    <option value="Emitida">Emitida</option>
                    <option value="Pagada">Pagada</option>
                    <option value="Anulada">Anulada</option>
                  </select>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="text-xl font-semibold">
                    Facturas generadas
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Numeración por año + A/B/C + número correlativo.
                  </p>
                </div>

                {cargando ? (
                  <p className="p-8 text-center text-slate-500">
                    Cargando facturas...
                  </p>
                ) : facturasFiltradas.length === 0 ? (
                  <p className="p-8 text-center text-slate-500">
                    Todavía no hay facturas con estos filtros.
                  </p>
                ) : (
                  <>
                    {facturasSeleccionadas.length > 0 && (
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div>
                          <p className="font-semibold">
                            {facturasSeleccionadas.length} factura
                            {facturasSeleccionadas.length === 1 ? "" : "s"} seleccionada
                            {facturasSeleccionadas.length === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Las facturas anuladas no se incluirán en el envío.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={exportarPdfsSeleccionados}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                          >
                            Exportar PDFs seleccionados
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEnvioBloque("whatsapp")}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                          >
                            Enviar bloque · WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEnvioBloque("correo")}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                          >
                            Enviar bloque · Correo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFacturasSeleccionadas([]);
                              setTipoEnvioBloque(null);
                              setEnviosAbiertos([]);
                            }}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600"
                          >
                            Deseleccionar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[1500px] text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={todasFacturasVisiblesSeleccionadas}
                              onChange={toggleTodasFacturasVisibles}
                              aria-label="Seleccionar todas las facturas visibles"
                              className="h-4 w-4"
                            />
                          </th>
                          <th className="px-4 py-3">
                            <BotonOrden
                              label="Nº factura"
                              icono={iconoOrden("numero_factura")}
                              onClick={() => cambiarOrdenFacturas("numero_factura")}
                            />
                          </th>
                          <th className="px-4 py-3">
                            <BotonOrden
                              label="Serie"
                              icono={iconoOrden("serie")}
                              onClick={() => cambiarOrdenFacturas("serie")}
                            />
                          </th>
                          <th className="px-4 py-3">
                            <BotonOrden
                              label="Número"
                              icono={iconoOrden("numero")}
                              onClick={() => cambiarOrdenFacturas("numero")}
                            />
                          </th>
                          <th className="px-4 py-3">
                            <BotonOrden
                              label="Fecha"
                              icono={iconoOrden("fecha")}
                              onClick={() => cambiarOrdenFacturas("fecha")}
                            />
                          </th>
                          <th className="px-4 py-3">
                            <BotonOrden
                              label="Cliente"
                              icono={iconoOrden("cliente")}
                              onClick={() => cambiarOrdenFacturas("cliente")}
                            />
                          </th>
                          <th className="px-4 py-3">
                            <BotonOrden
                              label="Estado"
                              icono={iconoOrden("estado")}
                              onClick={() => cambiarOrdenFacturas("estado")}
                            />
                          </th>
                          <th className="px-4 py-3 text-right">
                            <BotonOrden
                              label="Total"
                              icono={iconoOrden("total")}
                              onClick={() => cambiarOrdenFacturas("total")}
                              align="right"
                            />
                          </th>
                          <th className="px-4 py-3">Visualizar</th>
                          <th className="px-4 py-3">Acciones</th>
                          <th className="px-4 py-3">Enviar</th>
                        </tr>
                      </thead>

                      <tbody>
                        {facturasFiltradas.map((factura) => (
                          <tr
                            key={factura.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={facturasSeleccionadas.includes(factura.id)}
                                onChange={() => toggleFacturaSeleccionada(factura.id)}
                                aria-label={`Seleccionar factura ${factura.numero_factura}`}
                                className="h-4 w-4"
                              />
                            </td>

                            <td className="px-4 py-4 font-semibold">
                              {factura.numero_factura}
                            </td>

                            <td className="px-4 py-4">
                              {factura.serie || "—"}
                            </td>

                            <td className="px-4 py-4">
                              {factura.numero ?? "—"}
                            </td>

                            <td className="px-4 py-4">
                              {formatearFecha(factura.fecha)}
                            </td>

                            <td className="px-4 py-4">
                              {factura.cliente
                                ? `${factura.cliente.nombre} ${factura.cliente.apellidos || ""}`
                                : factura.cliente_nombre || "—"}
                              {factura.face_requiere && (
                                <span className="ml-2 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">FACe</span>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-col items-start gap-2">
                                <EstadoFactura estado={factura.estado} />
                                {factura.mostrar_pagado && (
                                  <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
                                    PAGADO visible
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right font-semibold">
                              {formatearImporte(factura.total)}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() => abrirFactura(factura)}
                                  className="font-medium hover:underline"
                                >
                                  Ver
                                </button>

                                <button
                                  type="button"
                                  onClick={() => prepararWord(factura)}
                                  className="font-medium text-blue-700 hover:underline"
                                >
                                  Word
                                </button>

                                <button
                                  type="button"
                                  onClick={() => generarPdfFactura(factura)}
                                  className="font-medium text-blue-700 hover:underline"
                                >
                                  Descargar PDF
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    actualizarMostrarPagado(
                                      factura,
                                      !factura.mostrar_pagado
                                    )
                                  }
                                  className={`font-medium hover:underline ${
                                    factura.mostrar_pagado
                                      ? "text-slate-600"
                                      : "text-green-700"
                                  }`}
                                >
                                  {factura.mostrar_pagado
                                    ? "Quitar PAGADO"
                                    : "Mostrar PAGADO"}
                                </button>

                                {factura.estado !== "Pagada" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cambiarEstadoFactura(factura, "Pagada")
                                    }
                                    className="font-medium text-green-700 hover:underline"
                                  >
                                    Marcar pagada
                                  </button>
                                )}

                                {factura.estado !== "Anulada" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cambiarEstadoFactura(factura, "Anulada")
                                    }
                                    className="font-medium text-amber-700 hover:underline"
                                  >
                                    Anular
                                  </button>
                                )}

                                <button
                                  type="button"
                                  disabled={eliminandoFacturaId === factura.id}
                                  onClick={() => eliminarFactura(factura)}
                                  className="font-medium text-red-600 hover:underline disabled:opacity-40"
                                >
                                  {eliminandoFacturaId === factura.id
                                    ? "Eliminando..."
                                    : "Eliminar"}
                                </button>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              {factura.estado === "Anulada" ? (
                                <span className="text-xs text-slate-400">
                                  No disponible
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-3">
                                  <button
                                    type="button"
                                    onClick={() => enviarFactura(factura, "whatsapp")}
                                    className="font-medium text-green-700 hover:underline"
                                  >
                                    WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => enviarFactura(factura, "correo")}
                                    className="font-medium text-blue-700 hover:underline"
                                  >
                                    Correo
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </section>
            </>
          )}

          {tipoEnvioBloque && facturasSeleccionadasEnviables.length > 0 && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    Envío en bloque · {tipoEnvioBloque === "whatsapp" ? "WhatsApp" : "Correo"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    ETHOS ha preparado una cola individual para cada factura. Abre cada envío y comprueba el destinatario antes de enviarlo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTipoEnvioBloque(null);
                    setEnviosAbiertos([]);
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2"
                >
                  Cerrar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Factura</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3">Estado del envío</th>
                      <th className="px-4 py-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasSeleccionadasEnviables.map((factura) => (
                      <tr key={factura.id} className="border-t border-slate-100">
                        <td className="px-4 py-4 font-semibold">
                          {factura.numero_factura}
                        </td>
                        <td className="px-4 py-4">
                          {nombreClienteFactura(factura)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {formatearImporte(factura.total)}
                        </td>
                        <td className="px-4 py-4">
                          {enviosAbiertos.includes(factura.id) ? (
                            <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                              Preparado / abierto
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => generarPdfFactura(factura)}
                              className="font-semibold text-slate-700 hover:underline"
                            >
                              PDF con plantilla
                            </button>
                            <button
                              type="button"
                              onClick={() => enviarFactura(factura, tipoEnvioBloque)}
                              className="font-semibold text-blue-700 hover:underline"
                            >
                              Abrir {tipoEnvioBloque === "whatsapp" ? "WhatsApp" : "Correo"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Cada PDF del bloque se genera con la plantilla fiscal asignada a esa factura y con el mismo diseño corporativo de ETHOS que el PDF individual. Por seguridad del navegador y para evitar envíos accidentales, cada conversación o correo se abre de forma individual; usa “PDF con plantilla” para preparar el documento correspondiente antes de adjuntarlo.
              </p>
            </section>
          )}

          {facturaDocumento && (
            <section className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    Generar Word · {facturaDocumento.numero_factura}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    ETHOS ha seleccionado automáticamente la plantilla correspondiente al perfil fiscal de esta factura. Puedes cambiarla aquí solo de forma excepcional.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFacturaDocumento(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
                <select
                  value={plantillaWordId}
                  onChange={(event) => setPlantillaWordId(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  {plantillasWord.map((plantilla) => (
                    <option key={plantilla.id} value={plantilla.id}>
                      {plantilla.nombre}
                      
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={generarWordFactura}
                  disabled={generandoWord || !plantillaWordId}
                  className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {generandoWord ? "Generando..." : "Generar Word"}
                </button>
              </div>

              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-blue-100 bg-white p-4">
                <input
                  type="checkbox"
                  checked={Boolean(facturaDocumento.mostrar_pagado)}
                  onChange={(event) =>
                    actualizarMostrarPagado(
                      facturaDocumento,
                      event.target.checked
                    )
                  }
                  className="h-4 w-4"
                />
                <span>
                  <span className="block font-semibold text-slate-800">
                    Mostrar “PAGADO” en esta factura
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Solo afecta a la mención visible en el documento; no cambia automáticamente el estado interno de la factura.
                  </span>
                </span>
              </label>

              <div className="mt-5 rounded-xl border border-blue-100 bg-white p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">Variables Word principales</p>
                <p className="mt-2">
                  {"{{factura_numero}} · {{factura_fecha}} · {{cliente_nombre}} · {{cliente_nif}} · {{paciente_nombre}} · {{base_imponible}} · {{iva_importe}} · {{irpf_importe}} · {{total_factura}} · {{pagado_texto}}"}
                </p>
                <p className="mt-2">
                  Para líneas repetidas usa: {"{{#lineas}} ... {{descripcion}} {{paciente}} {{unidades}} {{precio_unitario}} {{importe}} ... {{/lineas}}"}.
                  {" "}La variable {"{{paciente}}"} devuelve solo nombre y apellidos, sin añadir la palabra “Paciente”.
                </p>
                <p className="mt-2">
                  Para la mención de pago puedes usar {"{{pagado_texto}}"} o, si quieres controlar un bloque completo, {"{{#mostrar_pagado}}PAGADO{{/mostrar_pagado}}"}.
                </p>
              </div>
            </section>
          )}

          {facturaDetalle && (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">
                    Factura
                  </p>

                  <h2 className="text-2xl font-bold">
                    {facturaDetalle.numero_factura}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFacturaDetalle(null)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2"
                >
                  Cerrar
                </button>
              </div>

              <div className="mb-6 grid gap-5 md:grid-cols-4">
                <Dato
                  titulo="Cliente"
                  valor={
                    facturaDetalle.cliente_nombre ||
                    (facturaDetalle.cliente
                      ? `${facturaDetalle.cliente.nombre} ${facturaDetalle.cliente.apellidos || ""}`
                      : "—")
                  }
                />

                <Dato
                  titulo="Serie"
                  valor={facturaDetalle.serie || "—"}
                />

                <Dato
                  titulo="Número"
                  valor={
                    facturaDetalle.numero !== null
                      ? String(facturaDetalle.numero)
                      : "—"
                  }
                />

                <Dato
                  titulo="Fecha"
                  valor={formatearFecha(facturaDetalle.fecha)}
                />

                <Dato
                  titulo="Estado"
                  valor={facturaDetalle.estado}
                />
              </div>

              {cargandoDetalle ? (
                <p className="py-6 text-center text-slate-500">
                  Cargando líneas...
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Concepto</th>
                        <th className="px-4 py-3">Detalles</th>
                        <th className="px-4 py-3">Etiqueta</th>
                        <th className="px-4 py-3 text-right">Precio</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {lineasDetalle.map((linea) => (
                        <tr
                          key={linea.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-4 py-4">
                            {linea.concepto}
                          </td>

                          <td className="px-4 py-4">
                            {(() => {
                              const paciente = linea.patient_id
                                ? pacientes.find((item) => item.id === linea.patient_id)
                                : undefined;

                              return paciente
                                ? `${paciente.nombre} ${paciente.apellidos || ""}`.trim()
                                : "—";
                            })()}
                          </td>

                          <td className="px-4 py-4">
                            {linea.etiqueta_facturacion || "—"}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {formatearImporte(linea.precio_unitario)}
                          </td>

                          <td className="px-4 py-4 text-right font-semibold">
                            {formatearImporte(linea.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm rounded-xl bg-slate-50 p-5">
                  <div className="flex justify-between">
                    <span>Base imponible</span>
                    <strong>{formatearImporte(facturaDetalle.base_imponible ?? facturaDetalle.subtotal)}</strong>
                  </div>

                  <div className="mt-2 flex justify-between">
                    <span>IVA {facturaDetalle.iva_tipo === "sujeto" ? `${porcentaje(facturaDetalle.iva_porcentaje)} %` : facturaDetalle.iva_tipo === "exento" ? "(exento)" : facturaDetalle.iva_tipo === "no_sujeto" ? "(no sujeto)" : ""}</span>
                    <strong>{formatearImporte(facturaDetalle.iva_importe || 0)}</strong>
                  </div>

                  <div className="mt-2 flex justify-between">
                    <span>IRPF {porcentaje(facturaDetalle.irpf_porcentaje)} %</span>
                    <strong>{Number(facturaDetalle.irpf_importe || 0) > 0 ? `−${formatearImporte(facturaDetalle.irpf_importe || 0)}` : formatearImporte(0)}</strong>
                  </div>

                  <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-lg">
                    <span>Total</span>

                    <strong>
                      {formatearImporte(facturaDetalle.total)}
                    </strong>
                  </div>

                  {facturaDetalle.iva_tipo === "exento" && facturaDetalle.iva_exencion_texto && (
                    <p className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
                      {facturaDetalle.iva_exencion_texto}
                    </p>
                  )}

                  {facturaDetalle.face_requiere && (
                    <p className="mt-3 text-xs font-semibold text-blue-700">Factura electrónica FACe</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function BotonOrden({
  label,
  icono,
  onClick,
  align = "left",
}: {
  label: string;
  icono: string;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex w-full items-center gap-1 font-semibold hover:text-slate-900 ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
      title={`Ordenar por ${label}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-xs">
        {icono}
      </span>
    </button>
  );
}

function Pestana({
  label,
  activa,
  onClick,
}: {
  label: string;
  activa: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-medium ${
        activa
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-300 px-4 py-3"
      />
    </div>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div>
      <p className="text-sm text-slate-500">
        {titulo}
      </p>

      <p className="mt-1 font-medium">
        {valor}
      </p>
    </div>
  );
}

function EstadoFactura({
  estado,
}: {
  estado: string;
}) {
  let clases =
    "bg-slate-100 text-slate-700";

  if (estado === "Emitida") {
    clases =
      "bg-blue-50 text-blue-700";
  }

  if (estado === "Pagada") {
    clases =
      "bg-green-50 text-green-700";
  }

  if (estado === "Anulada") {
    clases =
      "bg-red-50 text-red-700";
  }

  if (estado === "Borrador") {
    clases =
      "bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${clases}`}
    >
      {estado}
    </span>
  );
}

function porcentaje(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function descripcionIva(cliente: Cliente) {
  if (cliente.iva_tipo === "exento") return "Exento";
  if (cliente.iva_tipo === "no_sujeto") return "No sujeto";
  if (cliente.iva_tipo === "sujeto") return `${porcentaje(cliente.iva_porcentaje)} %`;
  return "Pendiente";
}

function calcularFiscalidad(base: number, cliente: Cliente) {
  const ivaPorcentaje = cliente.iva_tipo === "sujeto" ? Number(cliente.iva_porcentaje || 0) : 0;
  const irpfPorcentaje = Number(cliente.irpf_porcentaje || 0);
  const ivaImporte = Math.round((Number(base) * ivaPorcentaje) / 100 * 100) / 100;
  const irpfImporte = Math.round((Number(base) * irpfPorcentaje) / 100 * 100) / 100;
  const total = Math.round((Number(base) + ivaImporte - irpfImporte) * 100) / 100;
  return { ivaImporte, irpfImporte, total };
}

function plantillaFiscalAutomatica(cliente: Cliente, plantillas: PlantillaWord[]) {
  const irpf = Number(cliente.irpf_porcentaje || 0);

  let perfil: string | null = null;

  if (cliente.iva_tipo === "exento") {
    perfil = irpf > 0 ? "exento_irpf15" : "exento_irpf0";
  } else if (
    cliente.iva_tipo === "sujeto" &&
    Number(cliente.iva_porcentaje || 0) === 21
  ) {
    perfil = irpf > 0 ? "iva21_irpf15" : "iva21_irpf0";
  }

  if (!perfil) return null;

  return plantillas.find((p) => p.perfil_fiscal === perfil) || null;
}

function formatearFecha(fecha: string) {
  if (!fecha) return "—";

  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearImporte(importe: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number(importe) || 0);
}
