import { ExternalLink, HardDrive, ShieldCheck } from "lucide-react";
import { RIOT_LEGAL_NOTICE } from "../../domain/constants";

export function AboutPage() {
  return (
    <div className="about-page page">
      <header className="page-heading">
        <div>
          <h1>Sobre o PickBoard</h1>
          <p>Uma ferramenta local e manual para organizar seu contexto de draft.</p>
        </div>
      </header>

      <div className="about-layout">
        <section className="about-intro">
          <div className="about-logo" aria-hidden="true">
            PB
          </div>
          <div>
            <h2>PickBoard 0.1.0</h2>
            <p>
              Picks, bans, pools e prompts permanecem neste dispositivo. O aplicativo não possui
              backend, conta, analytics ou telemetria.
            </p>
          </div>
        </section>

        <section className="about-feature">
          <HardDrive size={20} aria-hidden="true" />
          <div>
            <h3>Preparado para uso offline</h3>
            <p>
              O catálogo e os ícones dos campeões são distribuídos com o aplicativo. A rede só é
              usada quando você solicita uma verificação de atualização.
            </p>
          </div>
        </section>

        <section className="legal-notice" aria-labelledby="legal-title">
          <div className="legal-heading">
            <ShieldCheck size={19} aria-hidden="true" />
            <h2 id="legal-title">Produto de terceiros</h2>
          </div>
          <p lang="en">{RIOT_LEGAL_NOTICE}</p>
          <div className="legal-source">
            <ExternalLink size={14} aria-hidden="true" />
            Formulação oficial consultada na Política Geral do Riot Developer Portal, atualizada em
            11 de março de 2025.
          </div>
        </section>

        <section className="about-meta">
          <dl>
            <div>
              <dt>Licença</dt>
              <dd>MIT</dd>
            </div>
            <div>
              <dt>Dados estáticos</dt>
              <dd>Riot Data Dragon</dd>
            </div>
            <div>
              <dt>Plataforma principal</dt>
              <dd>Windows 10 e 11, x64</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
