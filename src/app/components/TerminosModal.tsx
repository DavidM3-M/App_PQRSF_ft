import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { X, FileCheck, CheckCircle, Shield, Scale, Book, FileText } from "lucide-react";
import { toast } from "sonner";

interface TerminosModalProps {
  mostrar: boolean;
  onCerrar: () => void;
  onAceptar: () => void;
}

export function TerminosModal({ mostrar, onCerrar, onAceptar }: TerminosModalProps) {
  return (
    <AnimatePresence>
      {mostrar && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCerrar}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto hide-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="relative bg-gradient-to-br from-[#1e3a5f] to-[#2a4a6f] p-8 rounded-t-2xl">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onCerrar}
                  className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 backdrop-blur-sm transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </motion.button>
                
                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm"
                  >
                    <FileCheck className="h-8 w-8 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">
                      Términos y Condiciones
                    </h2>
                    <p className="text-white/90 text-lg mt-1">
                      Sistema PQRS Institucional - Marco Legal Colombiano
                    </p>
                  </div>
                </div>
              </div>

              {/* Body del Modal */}
              <div className="p-8 space-y-6">
                {/* Marco Legal */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border-l-4 border-[#1e3a5f]">
                  <div className="flex items-start gap-3 mb-4">
                    <Scale className="w-6 h-6 text-[#1e3a5f] flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">
                        Marco Normativo
                      </h3>
                      <p className="text-gray-700 mb-3">
                        Este sistema opera bajo el marco legal colombiano vigente:
                      </p>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                          <Book className="w-4 h-4 text-[#ff9800] flex-shrink-0 mt-0.5" />
                          <span><strong>Constitución Política de Colombia (1991)</strong> - Artículos 23 y 74: Derecho de petición</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Book className="w-4 h-4 text-[#ff9800] flex-shrink-0 mt-0.5" />
                          <span><strong>Código de Procedimiento Administrativo y de lo Contencioso Administrativo (Ley 1437 de 2011)</strong> - Artículos 13 a 33</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Book className="w-4 h-4 text-[#ff9800] flex-shrink-0 mt-0.5" />
                          <span><strong>Ley 1581 de 2012</strong> - Protección de Datos Personales (Habeas Data)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Book className="w-4 h-4 text-[#ff9800] flex-shrink-0 mt-0.5" />
                          <span><strong>Decreto 1074 de 2015</strong> - Único Reglamentario del Sector Comercio, Industria y Turismo</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Book className="w-4 h-4 text-[#ff9800] flex-shrink-0 mt-0.5" />
                          <span><strong>Ley 1712 de 2014</strong> - Ley de Transparencia y del Derecho de Acceso a la Información Pública</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#ff9800]" />
                    1. Definiciones y Alcance
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    De conformidad con el artículo 23 de la Constitución Política de Colombia, toda persona tiene derecho a presentar peticiones respetuosas a las autoridades por motivos de interés general o particular y a obtener pronta resolución.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li><strong>Petición:</strong> Solicitud elevada verbal o por escrito ante la entidad</li>
                      <li><strong>Queja:</strong> Manifestación de protesta, censura, descontento o inconformidad</li>
                      <li><strong>Reclamo:</strong> Manifestación de inconformidad referida al incumplimiento de obligaciones</li>
                      <li><strong>Sugerencia:</strong> Propuesta de mejora presentada por el ciudadano</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#ff9800]" />
                    2. Protección de Datos Personales (Ley 1581 de 2012)
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, la institución garantiza:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>El tratamiento de datos personales se realiza con autorización expresa del titular</li>
                    <li>Los datos serán utilizados exclusivamente para la gestión de PQRS</li>
                    <li>Se garantiza el derecho de acceso, actualización, rectificación y supresión (ARCO)</li>
                    <li>Los datos no serán transferidos a terceros sin consentimiento previo</li>
                    <li>Se implementan medidas de seguridad técnicas y administrativas adecuadas</li>
                    <li>El responsable del tratamiento es la institución contactable vía canales oficiales</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    3. Términos de Respuesta (Ley 1437 de 2011 - CPACA)
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="font-bold text-[#1e3a5f] mb-2">Peticiones de Información o Documentos</p>
                      <p className="text-sm text-gray-700"><strong>10 días hábiles</strong> (Art. 14 CPACA)</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="font-bold text-[#1e3a5f] mb-2">Peticiones de Consulta</p>
                      <p className="text-sm text-gray-700"><strong>30 días hábiles</strong> (Art. 14 CPACA)</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <p className="font-bold text-[#1e3a5f] mb-2">Quejas y Reclamos</p>
                      <p className="text-sm text-gray-700"><strong>15 días hábiles</strong> (Art. 17 CPACA)</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="font-bold text-[#1e3a5f] mb-2">Peticiones ante Autoridades</p>
                      <p className="text-sm text-gray-700"><strong>15 días hábiles</strong> (Art. 14 CPACA)</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 italic">
                    * Los términos pueden prorrogarse por períodos iguales, previa justificación y notificación al peticionario (Art. 15 CPACA)
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    4. Derechos del Peticionario
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    De conformidad con el artículo 16 del CPACA, usted tiene derecho a:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Obtener información sobre el estado de su solicitud en cualquier momento</li>
                    <li>Recibir respuesta de fondo, clara, congruente y oportuna</li>
                    <li>Que su petición sea resuelta sin dilaciones injustificadas</li>
                    <li>Interponer recursos contra las decisiones que resuelven su petición</li>
                    <li>Desistir de la petición en cualquier momento</li>
                    <li>Solicitar la actualización de los datos personales suministrados</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    5. Obligaciones del Peticionario
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Suministrar información veraz, completa y actualizada</li>
                    <li>Utilizar un lenguaje respetuoso y claro en sus comunicaciones</li>
                    <li>Aportar los documentos necesarios que soporten su solicitud</li>
                    <li>Actualizar la información de contacto si hay cambios durante el trámite</li>
                    <li>No presentar solicitudes abusivas o temerarias que entorpezcan la gestión</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    6. PQRS Anónimas
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Las PQRS presentadas de forma anónima serán tramitadas conforme a la normatividad vigente. 
                    Sin embargo, para quejas anónimas que puedan implicar investigaciones disciplinarias, 
                    se aplicará lo dispuesto en la Ley 734 de 2002 (Código Disciplinario Único). 
                    No será posible enviar notificaciones por correo electrónico, debiendo consultar el estado 
                    mediante el número de radicado.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    7. Archivos Adjuntos
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    Requisitos técnicos y legales:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>Formatos admitidos: PDF, JPG, JPEG, PNG, DOC, DOCX</li>
                    <li>Límite máximo: 5 archivos por solicitud</li>
                    <li>Los archivos deben estar libres de virus o código malicioso</li>
                    <li>Tamaño recomendado: No superior a 5MB por archivo</li>
                    <li>Los documentos digitalizados deben ser legibles</li>
                    <li>Se recomienda formato PDF/A para documentos de valor probatorio</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    8. Notificaciones y Comunicaciones
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Conforme al artículo 67 del CPACA, las notificaciones se realizarán por correo electrónico 
                    al autorizar expresamente este medio. En caso de no recibir notificación electrónica, 
                    se aplicarán las reglas generales de notificación personal o por aviso establecidas en la ley.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    9. Seguridad - Google reCAPTCHA
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Este sitio está protegido por reCAPTCHA de Google para prevenir envíos masivos automatizados 
                    y garantizar la integridad del sistema. Al usar este servicio, acepta las 
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#ff9800] hover:text-[#f57c00] underline mx-1">
                      Políticas de Privacidad
                    </a>
                    y 
                    <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#ff9800] hover:text-[#f57c00] underline mx-1">
                      Términos de Servicio
                    </a>
                    de Google.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    10. Silencio Administrativo Positivo
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    De conformidad con el artículo 83 del CPACA, si la entidad no responde dentro de los términos 
                    legales establecidos, se entenderá que la decisión es positiva, salvo en los casos exceptuados 
                    por la ley. El peticionario puede acudir a la acción de tutela si considera vulnerado su derecho 
                    fundamental de petición.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    11. Recursos y Acciones Legales
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-2">
                    Contra las respuestas a su PQRS proceden los siguientes recursos:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li><strong>Recurso de Reposición:</strong> Ante la misma autoridad que profirió la decisión</li>
                    <li><strong>Recurso de Apelación:</strong> Ante el superior jerárquico (si procede)</li>
                    <li><strong>Acción de Tutela:</strong> Cuando se vulnere el derecho fundamental de petición (Art. 86 C.P.)</li>
                    <li><strong>Acciones contenciosas:</strong> Ante la jurisdicción de lo contencioso administrativo</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    12. Modificaciones y Actualizaciones
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Nos reservamos el derecho de modificar estos términos y condiciones para ajustarlos a cambios 
                    normativos o mejoras en el servicio. Las modificaciones entrarán en vigencia inmediatamente 
                    después de su publicación en el sistema, conforme al principio de publicidad establecido en 
                    el artículo 65 del CPACA.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">
                    13. Información y Contacto
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Para consultas sobre estos términos, protección de datos personales, o ejercer sus derechos ARCO, 
                    puede contactarnos a través de los canales oficiales de atención al ciudadano de la institución. 
                    La información sobre horarios, direcciones y medios de contacto está disponible en nuestra página web.
                  </p>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Última actualización:</strong> 2 de Marzo de 2026
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Versión:</strong> 1.0 - Conforme a la normatividad colombiana vigente
                  </p>
                </div>

                <div className="mt-8 flex gap-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      onClick={() => {
                        onAceptar();
                        toast.success("Términos y condiciones aceptados", {
                          description: "Conforme a la normatividad colombiana vigente"
                        });
                      }}
                      className="w-full bg-[#4caf50] hover:bg-[#45a049] text-white font-bold py-6"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Acepto los Términos y Condiciones
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      onClick={onCerrar}
                      variant="outline"
                      className="py-6 border-2"
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
  );
}