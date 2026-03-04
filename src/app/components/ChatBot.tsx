import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MessageCircle, Info, FileText, Megaphone, Headphones, Send, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type ChatSection = "menu" | "info" | "documentos" | "comunicados" | "atencion";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const menuOptions = [
  {
    id: "info" as ChatSection,
    icon: Info,
    label: "Información",
    color: "bg-[#1e3a5f] hover:bg-[#2a4a6f]",
    description: "Información general sobre el sistema PQRS",
  },
  {
    id: "documentos" as ChatSection,
    icon: FileText,
    label: "Documentos",
    color: "bg-[#8B5CF6] hover:bg-[#7C3AED]",
    description: "Acceso a documentos y formularios",
  },
  {
    id: "comunicados" as ChatSection,
    icon: Megaphone,
    label: "Comunicados",
    color: "bg-[#10B981] hover:bg-[#059669]",
    description: "Últimos comunicados institucionales",
  },
  {
    id: "atencion" as ChatSection,
    icon: Headphones,
    label: "Atención",
    color: "bg-[#ff9800] hover:bg-[#f57c00]",
    description: "Asistente virtual de atención al cliente",
  },
];

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentSection, setCurrentSection] = useState<ChatSection>("menu");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      setShowMenu(false);
      setCurrentSection("menu");
    } else {
      setIsOpen(true);
      setTimeout(() => setShowMenu(true), 100);
    }
  };

  const handleOptionClick = (section: ChatSection) => {
    setShowMenu(false);
    setTimeout(() => {
      setCurrentSection(section);
      initializeSection(section);
    }, 300);
  };

  const initializeSection = (section: ChatSection) => {
    const initialMessages: Record<ChatSection, Message[]> = {
      menu: [],
      info: [
        {
          id: "1",
          text: "¡Hola! Aquí encontrarás información sobre nuestro sistema PQRS. ¿Sobre qué te gustaría saber más?",
          sender: "bot",
          timestamp: new Date(),
        },
      ],
      documentos: [
        {
          id: "1",
          text: "Tenemos disponibles los siguientes documentos:\n\n📄 Manual de usuario PQRS\n📄 Formato de petición\n📄 Política de tratamiento de datos\n📄 Términos y condiciones",
          sender: "bot",
          timestamp: new Date(),
        },
      ],
      comunicados: [
        {
          id: "1",
          text: "Últimos comunicados institucionales:\n\n📢 26/02/2026: Actualización del sistema PQRS\n📢 20/02/2026: Horarios de atención especial\n📢 15/02/2026: Nuevos canales de atención",
          sender: "bot",
          timestamp: new Date(),
        },
      ],
      atencion: [
        {
          id: "1",
          text: "¡Bienvenido al servicio de atención al cliente! Estoy aquí para ayudarte. ¿En qué puedo asistirte hoy?",
          sender: "bot",
          timestamp: new Date(),
        },
      ],
    };

    setMessages(initialMessages[section]);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");

    // Simular respuesta del bot
    setTimeout(() => {
      const botResponse = generateBotResponse(inputMessage, currentSection);
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  };

  const generateBotResponse = (userInput: string, section: ChatSection): Message => {
    const input = userInput.toLowerCase();
    let responseText = "";

    if (section === "info") {
      if (input.includes("pqrs") || input.includes("solicitud")) {
        responseText = "PQRS significa Peticiones, Quejas, Reclamos y Sugerencias. Es un sistema que te permite comunicar tus inquietudes y ser atendido en un máximo de 15 días hábiles.";
      } else if (input.includes("tiempo") || input.includes("días")) {
        responseText = "El tiempo de respuesta máximo es de 15 días hábiles según la normatividad vigente. Sin embargo, nos esforzamos por responder lo antes posible.";
      } else if (input.includes("radicado") || input.includes("número")) {
        responseText = "El radicado es un número único que se genera al presentar tu PQRS. Con este número puedes consultar el estado de tu solicitud en cualquier momento.";
      } else {
        responseText = "Puedo ayudarte con información sobre cómo funciona el sistema PQRS, tiempos de respuesta, tipos de solicitudes y seguimiento de radicados. ¿Qué te gustaría saber?";
      }
    } else if (section === "documentos") {
      if (input.includes("manual") || input.includes("guía")) {
        responseText = "El Manual de usuario PQRS está disponible para descarga. Te guía paso a paso en el proceso de radicación y seguimiento de solicitudes.";
      } else if (input.includes("formato") || input.includes("formulario")) {
        responseText = "Contamos con formatos descargables para facilitar tu solicitud. También puedes radicar directamente desde nuestra plataforma web.";
      } else if (input.includes("datos") || input.includes("privacidad")) {
        responseText = "Nuestra Política de tratamiento de datos protege tu información personal según la Ley 1581 de 2012. Tus datos son confidenciales y seguros.";
      } else {
        responseText = "Tenemos disponibles varios documentos: manuales, formatos, políticas y términos. ¿Cuál te interesa conocer más?";
      }
    } else if (section === "comunicados") {
      responseText = "Los comunicados se actualizan regularmente. Puedes revisarlos desde esta sección o suscribirte para recibir notificaciones por correo electrónico.";
    } else if (section === "atencion") {
      if (input.includes("horario") || input.includes("atención")) {
        responseText = "Nuestro horario de atención es de Lunes a Viernes de 8:00 AM a 5:00 PM. El sistema en línea está disponible 24/7.";
      } else if (input.includes("contacto") || input.includes("teléfono")) {
        responseText = "Puedes contactarnos:\n📞 Línea: (601) 123-4567\n📧 Email: pqrs@institucion.gov.co\n💬 Chat en línea disponible en horario laboral";
      } else if (input.includes("sede") || input.includes("dirección")) {
        responseText = "Nuestra sede principal está ubicada en Calle 123 #45-67, Bogotá. También puedes usar nuestros servicios en línea desde cualquier lugar.";
      } else {
        responseText = "Estoy aquí para ayudarte. Pregúntame sobre horarios, contacto, ubicación de sedes o cualquier duda que tengas sobre nuestros servicios.";
      }
    }

    return {
      id: Date.now().toString(),
      text: responseText,
      sender: "bot",
      timestamp: new Date(),
    };
  };

  const handleBack = () => {
    setCurrentSection("menu");
    setMessages([]);
    setShowMenu(true);
  };

  return (
    <>
      {/* Botón principal flotante - IZQUIERDA */}
      <motion.div
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={handleToggle}
          size="icon"
          className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl bg-gradient-to-br from-[#ff9800] to-[#f57c00] hover:from-[#f57c00] hover:to-[#e65100] border-2 border-white"
          aria-label="Abrir asistente"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Opciones en abanico - DESDE LA IZQUIERDA */}
      <AnimatePresence>
        {isOpen && showMenu && currentSection === "menu" && (
          <div className="fixed bottom-8 left-4 sm:bottom-10 sm:left-6 z-40">
            {menuOptions.map((option, index) => {
              // Distribución en abanico más espaciada (15° a 90°)
              const angle = 15 + (index * 25); // Ángulos: 15°, 40°, 65°, 90°
              const radius = window.innerWidth < 640 ? 90 : 110; // Radio intermedio
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              const Icon = option.icon;

              return (
                <motion.div
                  key={option.id}
                  initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                  animate={{ scale: 1, x: x, y: -y, opacity: 1 }}
                  exit={{ scale: 0, x: 0, y: 0, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: index * 0.05,
                  }}
                  className="absolute bottom-0 left-0"
                >
                  <div className="relative group">
                    <Button
                      onClick={() => handleOptionClick(option.id)}
                      size="icon"
                      className={`h-11 w-11 sm:h-12 sm:w-12 rounded-full shadow-xl ${option.color} text-white border-2 border-white`}
                      aria-label={option.label}
                    >
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                    
                    {/* Tooltip */}
                    <div className="hidden sm:block absolute left-14 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-2xl">
                        {option.label}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Panel de chat - IZQUIERDA */}
      <AnimatePresence>
        {isOpen && currentSection !== "menu" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-20 sm:bottom-24 left-4 sm:left-6 z-40 w-[calc(100vw-2rem)] sm:w-96"
            style={{ maxHeight: "calc(100vh - 6rem)" }}
          >
            <Card className="shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 6rem)" }}>
              <CardHeader className={`flex-shrink-0 ${
                currentSection === "info" ? "bg-blue-500" :
                currentSection === "documentos" ? "bg-green-500" :
                currentSection === "comunicados" ? "bg-purple-500" :
                "bg-orange-500"
              } text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {currentSection === "info" && <Info className="h-5 w-5" />}
                    {currentSection === "documentos" && <FileText className="h-5 w-5" />}
                    {currentSection === "comunicados" && <Megaphone className="h-5 w-5" />}
                    {currentSection === "atencion" && <Headphones className="h-5 w-5" />}
                    <CardTitle className="text-white text-base sm:text-lg">
                      {currentSection === "info" && "Información"}
                      {currentSection === "documentos" && "Documentos"}
                      {currentSection === "comunicados" && "Comunicados"}
                      {currentSection === "atencion" && "Atención al Cliente"}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-8 w-8 text-white hover:bg-white/20"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="text-white/90 text-sm">
                  {menuOptions.find(o => o.id === currentSection)?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 flex flex-col flex-1 min-h-0">
                {/* Área de mensajes */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 sm:px-4 py-2 ${
                          message.sender === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-200 text-gray-900"
                        }`}
                      >
                        <p className="text-xs sm:text-sm whitespace-pre-line">{message.text}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender === "user" ? "text-blue-200" : "text-gray-500"
                        }`}>
                          {message.timestamp.toLocaleTimeString("es-CO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Input de mensaje */}
                {currentSection === "atencion" || currentSection === "info" ? (
                  <div className="p-3 sm:p-4 border-t bg-white">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Escribe tu mensaje..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        className="text-sm"
                      />
                      <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        className="shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 sm:p-4 border-t bg-white text-center text-xs sm:text-sm text-gray-600">
                    <p>Para más información, visita nuestra sección de {
                      currentSection === "documentos" ? "Documentos" : "Comunicados"
                    }</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}