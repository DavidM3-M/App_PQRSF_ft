import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { FileText, Globe, Rocket, Award, ArrowRight, Search, Clock, Shield, Bell, AlertCircle, Lightbulb, X, CheckCircle, Users, Zap, Upload, Paperclip, UserX, FileCheck, ExternalLink, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { apiCreatePQRS, formatApiError, type PqrsType } from "../lib/api";
import ReCAPTCHA from "react-google-recaptcha";
import { TerminosModal } from "../components/TerminosModal";
import { CAPTCHA_DISABLED } from "../lib/config";

interface PQRSForm {
  tipo: PqrsType;
  asunto: string;
  descripcion: string;
  // Campos del remitente — todos opcionales (backend: blank=True, default='')
  nombre?: string;
  documento?: string;
  email?: string;
  telefono?: string;
}

const noScrollbarStyle: React.CSSProperties = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
} as React.CSSProperties;

export function Home() {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [selectedTipoPQRS, setSelectedTipoPQRS] = useState<PqrsType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [radicadoGenerado, setRadicadoGenerado] = useState<string | null>(null);
  const [showRadicadoModal, setShowRadicadoModal] = useState(false);
  const [copiedRadicado, setCopiedRadicado] = useState(false);
  const navigate = useNavigate();
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
  const [esAnonimo, setEsAnonimo] = useState(false);
  // Si CAPTCHA_DISABLED está activo (entorno local), se precarga un valor para bypass
  const [captchaValue, setCaptchaValue] = useState<string | null>(
    CAPTCHA_DISABLED ? "__local_bypass__" : null,
  );
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const { usuario, isAuthenticated } = useAuth();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Bloquear scroll del body cuando cualquier modal está abierto
  useEffect(() => {
    const anyOpen = selectedCard !== null || selectedTipoPQRS !== null || mostrarTerminos;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedCard, selectedTipoPQRS, mostrarTerminos]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PQRSForm>({
    defaultValues: {
      nombre: usuario?.nombre || "",
      email: usuario?.email || "",
    },
  });

  const onSubmit = async (data: PQRSForm) => {
    setIsLoading(true);
    try {
      const sendAsAnon = esAnonimo || !isAuthenticated;
      const result = await apiCreatePQRS(
        {
          type: data.tipo,
          subject: data.asunto,
          description: data.descripcion,
          ...(sendAsAnon && {
            anon_name: data.nombre ?? "",
            anon_document_number: data.documento ?? "",
            anon_email: data.email ?? "",
            anon_phone: data.telefono ?? "",
          }),
        },
        !sendAsAnon,
      );
      const radicado = result.numero_radicado ?? result.radicado ?? "";
      setRadicadoGenerado(radicado);
      setSelectedTipoPQRS(null); // cierra el modal del formulario
      setShowRadicadoModal(true);
    } catch (err) {
      toast.error("Error al radicar PQRS", { description: formatApiError(err) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFormModal = (tipo: PqrsType) => {
    setSelectedTipoPQRS(tipo);
    setValue("tipo", tipo);
    setRadicadoGenerado(null);
    setArchivosSeleccionados([]);
    setEsAnonimo(false);
  };

  const handleCloseFormModal = () => {
    setSelectedTipoPQRS(null);
    setRadicadoGenerado(null);
    setShowRadicadoModal(false);
    setArchivosSeleccionados([]);
    setEsAnonimo(false);
    reset();
  };

  const handleCopyRadicado = () => {
    if (!radicadoGenerado) return;
    navigator.clipboard.writeText(radicadoGenerado).then(() => {
      setCopiedRadicado(true);
      setTimeout(() => setCopiedRadicado(false), 2000);
    });
  };

  const tiposPQRS = [
    {
      tipo: "P",
      icon: FileText,
      title: "Petición",
      desc: "Solicitud de información, documentos o actuaciones",
      color: "#1e3a5f",
      bgColor: "#e8f0f7",
      borderColor: "border-[#1e3a5f]",
    },
    {
      tipo: "Q",
      icon: AlertCircle,
      title: "Queja",
      desc: "Manifestación de insatisfacción con el servicio recibido",
      color: "#ff9800",
      bgColor: "#fff3e0",
      borderColor: "border-[#ff9800]",
    },
    {
      tipo: "R",
      icon: AlertCircle,
      title: "Reclamo",
      desc: "Expresión de inconformidad por incumplimiento",
      color: "#d32f2f",
      bgColor: "#ffebee",
      borderColor: "border-[#d32f2f]",
    },
    {
      tipo: "S",
      icon: Lightbulb,
      title: "Sugerencia",
      desc: "Propuesta de mejora para nuestros servicios",
      color: "#4caf50",
      bgColor: "#e8f5e9",
      borderColor: "border-[#4caf50]",
    },
    {
      tipo: "F",
      icon: Award,
      title: "Felicitación",
      desc: "Reconocimiento por un buen servicio recibido",
      color: "#7b1fa2",
      bgColor: "#f3e5f5",
      borderColor: "border-[#7b1fa2]",
    },
  ];

  const cardInfo = [
    {
      icon: Globe,
      title: "SOMOS DIGITALES",
      desc: "Sistema en línea 24/7",
      delay: 0,
      detailedInfo: {
        subtitle: "Tecnología al servicio de la ciudadanía",
        features: [
          { icon: CheckCircle, text: "Plataforma web accesible desde cualquier dispositivo" },
          { icon: CheckCircle, text: "Disponibilidad 24 horas al día, 7 días a la semana" },
          { icon: CheckCircle, text: "No requiere desplazamientos físicos" },
          { icon: CheckCircle, text: "Interfaz intuitiva y fácil de usar" },
        ],
        description: "Nuestro sistema digital le permite radicar y consultar sus PQRS en cualquier momento y desde cualquier lugar, garantizando accesibilidad total para toda la ciudadanía.",
      },
    },
    {
      icon: Rocket,
      title: "SOMOS ÁGILES",
      desc: "Respuesta en 15 días hábiles",
      delay: 0.1,
      detailedInfo: {
        subtitle: "Rapidez y eficiencia garantizada",
        features: [
          { icon: Zap, text: "Tiempo de respuesta máximo: 15 días hábiles" },
          { icon: Zap, text: "Asignación automática a áreas competentes" },
          { icon: Zap, text: "Notificaciones inmediatas de cada cambio" },
          { icon: Zap, text: "Equipo dedicado trabajando en su solicitud" },
        ],
        description: "Cumplimos con los tiempos establecidos por la ley, asegurando que cada solicitud sea atendida de manera oportuna y eficiente por nuestro equipo capacitado.",
      },
    },
    {
      icon: Shield,
      title: "SOMOS TRANSPARENTES",
      desc: "Seguimiento en tiempo real",
      delay: 0.2,
      detailedInfo: {
        subtitle: "Información clara en cada etapa",
        features: [
          { icon: Search, text: "Consulta del estado de su PQRS en tiempo real" },
          { icon: Search, text: "Historial completo de su solicitud" },
          { icon: Search, text: "Trazabilidad de todas las acciones realizadas" },
          { icon: Search, text: "Notificaciones por correo electrónico" },
        ],
        description: "La transparencia es fundamental. Puede consultar en cualquier momento el estado exacto de su solicitud y conocer quién está trabajando en ella.",
      },
    },
    {
      icon: Award,
      title: "SOMOS CALIDAD",
      desc: "Compromiso con la excelencia",
      delay: 0.3,
      detailedInfo: {
        subtitle: "Excelencia en cada respuesta",
        features: [
          { icon: Users, text: "Personal altamente capacitado" },
          { icon: Users, text: "Respuestas completas y bien fundamentadas" },
          { icon: Users, text: "Seguimiento hasta la resolución final" },
          { icon: Users, text: "Evaluación continua de nuestros servicios" },
        ],
        description: "Nuestro compromiso es brindar respuestas de calidad que satisfagan sus necesidades y resuelvan efectivamente sus inquietudes o solicitudes.",
      },
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-[#0f2440] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f2440] via-[#1e3a5f] to-[#0d1f35]" />
        <div
          className="absolute top-0 right-0 h-full w-1/2 pointer-events-none"
          style={{ background: "linear-gradient(135deg, transparent 40%, rgba(255,152,0,0.08) 100%)" }}
        />
        <div
          className="absolute bottom-0 right-0 w-[420px] h-[420px] pointer-events-none opacity-10"
          style={{ background: "radial-gradient(circle at center, #ff9800 0%, transparent 70%)", transform: "translate(30%, 30%)" }}
        />
        <div
          className="absolute top-0 right-[38%] w-[2px] h-full pointer-events-none opacity-20"
          style={{ background: "linear-gradient(to bottom, transparent, #ff9800, #ffc107, transparent)", transform: "rotate(-12deg)", transformOrigin: "top center" }}
        />
        <div className="relative z-10 container mx-auto px-4 py-14 md:py-20">
          <div className="max-w-3xl">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-[#ffc107] text-sm sm:text-base font-semibold mb-4 tracking-[0.2em] uppercase"
            >
              Buscamos la excelencia en
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight text-white"
            >
              Atención y Servicio
              <span className="block w-16 h-1 mt-4 rounded-full bg-[#ff9800]" />
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base sm:text-lg text-white/70 mb-10 max-w-xl"
            >
              Sistema PQRS — Peticiones, Quejas, Reclamos y Sugerencias
            </motion.p>
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: "#ffc107", clipPath: "polygon(0 20%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-28 bg-white pointer-events-none"
          style={{ clipPath: "polygon(0 68%, 100% 42%, 100% 100%, 0 100%)" }}
        />
      </div>

      {/* Botón Consultar Radicado */}
      <div className="relative -mt-8 z-20 mb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto flex justify-center">
            <Link to="/consulta">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" className="bg-white text-[#1e3a5f] hover:bg-[#ffc107] hover:text-[#1e3a5f] font-bold px-16 py-8 text-xl h-auto shadow-2xl border-2 border-white">
                  <Search className="h-7 w-7 mr-3" />
                  CONSULTAR RADICADO
                  <ArrowRight className="h-6 w-6 ml-3" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </div>

      {/* Tipos de PQRS */}
      <div className="relative z-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {tiposPQRS.map((tipo) => (
              <motion.div
                key={tipo.tipo}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleOpenFormModal(tipo.tipo as PqrsType)}
                className="cursor-pointer"
              >
                <Card className={`hover:shadow-2xl transition-all ${tipo.borderColor} border-2 h-full bg-white shadow-xl`}>
                  <CardHeader className="text-center pb-6 pt-8">
                    <div className="mb-4 flex justify-center">
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="flex h-20 w-20 items-center justify-center rounded-full"
                        style={{ backgroundColor: tipo.bgColor }}
                      >
                        <tipo.icon className="h-10 w-10" style={{ color: tipo.color }} />
                      </motion.div>
                    </div>
                    <CardTitle className="text-[#1e3a5f] text-xl font-bold uppercase tracking-wide">
                      {tipo.title}
                    </CardTitle>
                    <CardDescription className="text-base font-medium mt-2">
                      {tipo.desc}
                    </CardDescription>
                    <motion.p
                      className="text-gray-500 text-xs mt-3 italic"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                    >
                      Click para radicar esta solicitud
                    </motion.p>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Cards Institucionales */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">
            Nuestro Compromiso con Usted
          </h2>
          <p className="text-lg text-gray-600">
            Características que nos definen en la atención al ciudadano
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
          {cardInfo.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: item.delay }}
              whileHover={{ scale: 1.05, rotate: 1 }}
              onClick={() => setSelectedCard(index)}
              className="cursor-pointer"
            >
              <Card className="bg-gradient-to-br from-[#ffc107] to-[#ff9800] border-none shadow-2xl hover:shadow-3xl transition-all">
                <CardHeader className="text-center">
                  <div className="mb-4 flex justify-center">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm"
                    >
                      <item.icon className="h-10 w-10 text-white" />
                    </motion.div>
                  </div>
                  <CardTitle className="text-white text-xl font-bold uppercase tracking-wide">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-white/95 font-medium">
                    {item.desc}
                  </CardDescription>
                  <motion.p
                    className="text-white/80 text-xs mt-3 italic"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  >
                    Click para más información
                  </motion.p>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Modal Informativo (SOMOS DIGITALES, etc.) ─── */}
      {createPortal(
      <AnimatePresence>
        {selectedCard !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                style={noScrollbarStyle}
              >
                {/* Header */}
                <div className="relative bg-gradient-to-br from-[#ffc107] to-[#ff9800] p-8 rounded-t-2xl">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedCard(null)}
                    className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 backdrop-blur-sm transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </motion.button>
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm"
                    >
                      {(() => {
                        const IconComponent = cardInfo[selectedCard].icon;
                        return <IconComponent className="h-8 w-8 text-white" />;
                      })()}
                    </motion.div>
                    <div>
                      <h2 className="text-3xl font-bold text-white">
                        {cardInfo[selectedCard].title}
                      </h2>
                      <p className="text-white/90 text-lg mt-1">
                        {cardInfo[selectedCard].detailedInfo.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-8">
                  <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    {cardInfo[selectedCard].detailedInfo.description}
                  </p>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-4">
                    Características principales:
                  </h3>
                  <div className="space-y-4">
                    {cardInfo[selectedCard].detailedInfo.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-3 p-4 bg-gradient-to-r from-[#e8f0f7] to-white rounded-lg border-l-4 border-[#ff9800]"
                      >
                        <feature.icon className="w-6 h-6 text-[#ff9800] flex-shrink-0 mt-0.5" />
                        <p className="text-gray-800 font-medium">{feature.text}</p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => setSelectedCard(null)}
                        className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold py-6"
                      >
                        Cerrar
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      , document.body)}

      {/* ─── Modal Formulario PQRS ─── */}
      {createPortal(
      <AnimatePresence>
        {selectedTipoPQRS !== null && (() => {
          const tipoActual = tiposPQRS.find(t => t.tipo === selectedTipoPQRS);
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseFormModal}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />
              <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  style={noScrollbarStyle}
                >
                  {/* Header */}
                  <div
                    className="relative p-8 rounded-t-2xl"
                    style={{ background: `linear-gradient(to bottom right, ${tipoActual?.color}, ${tipoActual?.color}dd)` }}
                  >
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCloseFormModal}
                      className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 backdrop-blur-sm transition-colors"
                    >
                      <X className="w-6 h-6 text-white" />
                    </motion.button>
                    <div className="flex items-center gap-4 mb-4">
                      <motion.div
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm"
                      >
                        {(() => {
                          const IconComponent = tipoActual?.icon;
                          return IconComponent ? <IconComponent className="h-8 w-8 text-white" /> : null;
                        })()}
                      </motion.div>
                      <div>
                        <h2 className="text-3xl font-bold text-white">{tipoActual?.title}</h2>
                        <p className="text-white/90 text-lg mt-1">{tipoActual?.desc}</p>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-8">
                    <form onSubmit={handleSubmit(onSubmit)}>
                      <div className="space-y-5">
                        {/* Anónimo */}
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
                        >
                          <Checkbox
                            id="anonimo"
                            checked={esAnonimo}
                            onCheckedChange={(checked) => {
                              setEsAnonimo(checked as boolean);
                              if (checked) {
                                toast.info("Modo anónimo activado: todos los datos de contacto son opcionales");
                              }
                            }}
                          />
                          <div className="flex-1">
                            <label htmlFor="anonimo" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                              <UserX className="w-4 h-4 text-gray-600" />
                              Radicar como anónimo
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5">Su identidad no será revelada en el sistema</p>
                          </div>
                        </motion.div>

                        <div>
                          <Label htmlFor="asunto" className="text-base font-semibold">Asunto *</Label>
                          <Input
                            id="asunto"
                            placeholder="Ingrese el asunto de su PQRS"
                            {...register("asunto", { required: "El asunto es requerido" })}
                            className={`w-full mt-1 ${errors.asunto ? "border-red-500" : ""}`}
                          />
                          <AnimatePresence>
                            {errors.asunto && (
                              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2 mt-2 p-2 bg-red-50 border-l-4 border-red-500 rounded">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <p className="text-red-700 text-sm font-medium">{errors.asunto.message}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div>
                          <Label htmlFor="descripcion" className="text-base font-semibold">Descripción *</Label>
                          <Textarea
                            id="descripcion"
                            placeholder="Ingrese una descripción detallada de su PQRS"
                            {...register("descripcion", { required: "La descripción es requerida" })}
                            className={`w-full mt-1 min-h-[120px] ${errors.descripcion ? "border-red-500" : ""}`}
                          />
                          <AnimatePresence>
                            {errors.descripcion && (
                              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2 mt-2 p-2 bg-red-50 border-l-4 border-red-500 rounded">
                                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <p className="text-red-700 text-sm font-medium">{errors.descripcion.message}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <AnimatePresence>
                          {(!isAuthenticated && !esAnonimo) && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                              <div className="border-t pt-2">
                                <p className="text-sm font-semibold text-gray-700 mb-3">Datos de Contacto <span className="text-gray-400 font-normal text-xs">(todos opcionales)</span></p>
                              </div>
                              <div>
                                <Label htmlFor="nombre" className="text-base font-semibold">Nombre completo <span className="text-gray-400 text-sm font-normal">(opcional)</span></Label>
                                <Input
                                  id="nombre"
                                  placeholder="Ingrese su nombre completo"
                                  {...register("nombre")}
                                  className="w-full mt-1"
                                />
                                <AnimatePresence>
                                  {errors.nombre && (
                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2 mt-2 p-2 bg-red-50 border-l-4 border-red-500 rounded">
                                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                      <p className="text-red-700 text-sm font-medium">{errors.nombre.message}</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <div>
                                <Label htmlFor="documento" className="text-base font-semibold">Número de Documento <span className="text-gray-400 text-sm font-normal">(opcional)</span></Label>
                                <Input
                                  id="documento"
                                  placeholder="Ej: 1234567890"
                                  {...register("documento", { minLength: { value: 5, message: "Mínimo 5 caracteres" } })}
                                  className={`w-full mt-1 ${errors.documento ? "border-red-500" : ""}`}
                                />
                                <AnimatePresence>
                                  {errors.documento && (
                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2 mt-2 p-2 bg-red-50 border-l-4 border-red-500 rounded">
                                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                      <p className="text-red-700 text-sm font-medium">{errors.documento.message}</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <div>
                                <Label htmlFor="email" className="text-base font-semibold">Correo Electrónico <span className="text-gray-400 text-sm font-normal">(opcional)</span></Label>
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="Ingrese su email"
                                  {...register("email", { pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Ingrese un email válido" } })}
                                  className={`w-full mt-1 ${errors.email ? "border-red-500" : ""}`}
                                />
                                <AnimatePresence>
                                  {errors.email && (
                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex items-center gap-2 mt-2 p-2 bg-red-50 border-l-4 border-red-500 rounded">
                                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                      <p className="text-red-700 text-sm font-medium">{errors.email.message}</p>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <div>
                                <Label htmlFor="telefono" className="text-base font-semibold">Teléfono <span className="text-gray-400 text-sm">(opcional)</span></Label>
                                <Input id="telefono" placeholder="Ingrese su teléfono" {...register("telefono")} className="w-full mt-1" />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Archivos */}
                        <div>
                          <Label htmlFor="archivos" className="text-base font-semibold">Adjuntar archivos <span className="text-gray-400 text-sm">(opcional)</span></Label>
                          <p className="text-sm text-gray-500 mb-2 mt-1">Formatos permitidos: PDF, JPG, PNG, DOC, DOCX. Máximo 5 archivos.</p>
                          <div className="space-y-3">
                            <Input id="archivos" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files) {
                                  const fileArray = Array.from(files);
                                  if (fileArray.length > 5) { toast.error("Máximo 5 archivos permitidos"); return; }
                                  setArchivosSeleccionados(fileArray);
                                  toast.success(`${fileArray.length} archivo(s) seleccionado(s)`);
                                }
                              }}
                              className="hidden"
                            />
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button type="button" variant="outline" className="w-full border-2 border-dashed border-gray-300 hover:border-[#ff9800] hover:bg-[#ff9800]/5 py-6 transition-all" onClick={() => document.getElementById("archivos")?.click()}>
                                <Upload className="w-5 h-5 mr-2" />
                                Seleccionar Archivos
                              </Button>
                            </motion.div>
                            {archivosSeleccionados.length > 0 && (
                              <div className="space-y-2">
                                {archivosSeleccionados.map((file, index) => (
                                  <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center justify-between p-3 bg-gradient-to-r from-[#fff3e0] to-white rounded-lg border border-[#ff9800]/30">
                                    <div className="flex items-center gap-2">
                                      <Paperclip className="w-4 h-4 text-[#ff9800]" />
                                      <span className="text-sm text-gray-700 truncate max-w-[200px] font-medium">{file.name}</span>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{(file.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => { setArchivosSeleccionados(archivosSeleccionados.filter((_, i) => i !== index)); toast.info("Archivo eliminado"); }} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Términos */}
                        <div className="mt-6">
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0, scale: aceptaTerminos ? [1, 1.02, 1] : 1 }}
                            transition={{ scale: { duration: 0.3 } }}
                            className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 relative overflow-hidden"
                          >
                            <AnimatePresence>
                              {aceptaTerminos && (
                                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 2, opacity: [0.3, 0] }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 bg-green-400 rounded-full" style={{ transformOrigin: "center" }} />
                              )}
                            </AnimatePresence>
                            <motion.div animate={{ scale: aceptaTerminos ? [1, 1.2, 1] : 1, rotate: aceptaTerminos ? [0, 5, -5, 0] : 0 }} transition={{ duration: 0.5 }}>
                              <Checkbox id="aceptaTerminos" checked={aceptaTerminos} onCheckedChange={(checked) => setAceptaTerminos(checked as boolean)} className="mt-1" />
                            </motion.div>
                            <div className="flex-1 relative z-10">
                              <label htmlFor="aceptaTerminos" className="text-sm font-medium text-gray-900 cursor-pointer block">
                                <motion.span animate={{ scale: aceptaTerminos ? [1, 1.05, 1] : 1 }} transition={{ duration: 0.3 }} className="inline-flex items-center gap-1">
                                  <FileCheck className="w-4 h-4 text-blue-600" />
                                  <span>Acepto los</span>
                                  <button type="button" onClick={(e) => { e.preventDefault(); setMostrarTerminos(true); }} className="text-[#ff9800] font-semibold hover:text-[#f57c00] underline inline-flex items-center gap-1 transition-colors">
                                    Términos y Condiciones
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </motion.span>
                              </label>
                              <motion.p className="text-xs mt-1 font-medium" animate={{ color: aceptaTerminos ? "#22c55e" : "#6b7280" }}>
                                {aceptaTerminos ? "✓ Términos aceptados" : "Es obligatorio aceptar los términos para continuar"}
                              </motion.p>
                            </div>
                          </motion.div>
                        </div>

                        {/* reCAPTCHA – oculto en entorno local (VITE_DISABLE_CAPTCHA=true) */}
                        {!CAPTCHA_DISABLED && (
                          <div className="mt-4">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                              <ReCAPTCHA ref={recaptchaRef} sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? "YOUR_RECAPTCHA_SITE_KEY"} size="normal" onChange={(value) => setCaptchaValue(value)} />
                            </motion.div>
                            {!captchaValue && (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-gray-500 text-center mt-2">
                                Por favor, complete la verificación CAPTCHA
                              </motion.p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-8 flex gap-3">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                          <Button
                            type="submit"
                            className="w-full text-white font-bold py-6"
                            style={{ backgroundColor: tipoActual?.color }}
                            disabled={isLoading || !captchaValue || !aceptaTerminos}
                          >
                            {isLoading ? (
                              <div className="flex items-center">
                                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Enviando...
                              </div>
                            ) : (
                              <>
                                <FileText className="w-5 h-5 mr-2" />
                                Radicar PQRS Ahora
                              </>
                            )}
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={handleCloseFormModal} variant="outline" className="py-6 border-2">
                            Cerrar
                          </Button>
                        </motion.div>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>
      , document.body)}

      {/* ─── Modal Radicado Exitoso (fuera del portal del formulario) ─── */}
      <Dialog open={showRadicadoModal} onOpenChange={(open) => { if (!open) { setShowRadicadoModal(false); setSelectedTipoPQRS(null); setRadicadoGenerado(null); reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-2">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-green-900 text-xl">¡PQRS Radicada Exitosamente!</DialogTitle>
            <DialogDescription>
              Su solicitud será procesada en un plazo de hasta{" "}
              <strong>15 días hábiles</strong> según la Ley 1755 de 2015.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-5 text-center my-2">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Número de Radicado</p>
            <p className="text-3xl font-bold text-blue-600 tracking-wider mb-3">{radicadoGenerado}</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyRadicado}>
              {copiedRadicado ? (
                <><Check className="h-4 w-4 text-green-600" /> ¡Copiado!</>
              ) : (
                <><Copy className="h-4 w-4" /> Copiar radicado</>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Guarde este número. Lo necesitará para consultar el estado de su solicitud.
          </p>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold" onClick={() => { handleCloseFormModal(); navigate("/consulta"); }}>
              Consultar Estado
            </Button>
            <Button variant="outline" className="w-full" onClick={handleCloseFormModal}>
              Radicar Otra PQRS
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleCloseFormModal}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Información Importante */}
      <div className="bg-[#e8f0f7] py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-8 text-center">Información Importante</h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-t-4 border-t-[#ff9800]">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ff9800]">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-[#1e3a5f]">Tiempo de Respuesta</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">Su solicitud será atendida en un plazo <strong>máximo de 15 días hábiles</strong> según la normatividad vigente.</p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-[#1e3a5f]">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1e3a5f]">
                    <Search className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-[#1e3a5f]">Seguimiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">Una vez radicada su PQRS, recibirá un <strong>número de radicado</strong> con el cual podrá consultar el estado en tiempo real.</p>
                </CardContent>
              </Card>
              <Card className="border-t-4 border-t-[#4caf50]">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#4caf50]">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-[#1e3a5f]">Notificaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">Las respuestas serán enviadas al <strong>correo electrónico</strong> proporcionado y estarán disponibles en su panel.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-[#1e3a5f] text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">¿Necesita ayuda?</h2>
          <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
            Nuestro equipo está disponible para asistirle en el proceso de radicación y seguimiento de su PQRS
          </p>
          <Button size="lg" className="bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold px-8 py-6 text-lg h-auto">
            CONTACTAR SOPORTE
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* Modal Términos y Condiciones */}
      <AnimatePresence>
        {mostrarTerminos && (
          <TerminosModal
            mostrar={mostrarTerminos}
            onCerrar={() => setMostrarTerminos(false)}
            onAceptar={() => { setAceptaTerminos(true); setMostrarTerminos(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
