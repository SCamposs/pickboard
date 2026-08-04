import { Cable, HardDrive, ShieldCheck } from "lucide-react";
import { RIOT_LEGAL_NOTICE } from "../../domain/constants";
import { APP_VERSION } from "../../services/appUpdate";

export function AboutPage() {
  return (
    <div className="about-page page">
      <header className="page-heading">
        <div>
          <h1>Sobre o PickBoard</h1>
          <p>Uma ferramenta local para organizar e sincronizar seu contexto de draft.</p>
        </div>
      </header>

      <div className="about-layout">
        <section className="about-intro">
          <div className="about-logo" aria-hidden="true">
            PB
          </div>
          <div>
            <h2>PickBoard {APP_VERSION}</h2>
            <p>
              Seus picks, bans, pools e prompts permanecem neste dispositivo. O PickBoard não
              exige conta e não envia dados de uso.
            </p>
          </div>
        </section>

        <section className="about-feature">
          <Cable size={20} aria-hidden="true" />
          <div>
            <h3>Sincronização com o League</h3>
            <p>
              Acompanha picks e bans confirmados enquanto o League Client estiver aberto. Você
              pode desativar a sincronização quando quiser e continuar preenchendo tudo
              manualmente. Atualizações do cliente podem interromper esse acompanhamento
              temporariamente.
            </p>
          </div>
        </section>

        <section className="about-feature">
          <HardDrive size={20} aria-hidden="true" />
          <div>
            <h3>Preparado para uso offline</h3>
            <p>
              O catálogo e os ícones dos campeões são distribuídos com o aplicativo. A internet só
              é usada quando você solicita uma verificação de atualização.
            </p>
          </div>
        </section>

        <section className="legal-notice" aria-labelledby="legal-title">
          <div className="legal-heading">
            <ShieldCheck size={19} aria-hidden="true" />
            <h2 id="legal-title">Produto de terceiros</h2>
          </div>
          <p lang="en">{RIOT_LEGAL_NOTICE}</p>
        </section>
      </div>
    </div>
  );
}
