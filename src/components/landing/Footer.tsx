import { Car } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Coluna 1: Logo e Tagline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-6 h-6" />
              <span className="font-bold text-xl">Meus Transportes</span>
            </div>
            <p className="text-slate-400 text-sm">
              Gestão inteligente para sua frota
            </p>
          </div>

          {/* Coluna 2: Links Institucionais */}
          <div>
            <h3 className="font-semibold mb-3">Institucional</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Termos de Uso
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Política de Privacidade
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contato/Suporte
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Acesso */}
          <div>
            <h3 className="font-semibold mb-3">Acesso</h3>
            <Link 
              to="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Entrar na plataforma →
            </Link>
          </div>
        </div>

        {/* Rodapé inferior */}
        <div className="pt-8 border-t border-slate-800 text-center text-sm text-slate-400">
          © 2025 Meus Transportes. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
