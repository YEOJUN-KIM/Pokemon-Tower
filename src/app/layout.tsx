import type { Metadata } from 'next';
import './globals.css';
import '../web/game-theme.css';
import '../web/retro-theme.css';
import '../web/gimmick-theme.css';
import '../web/tera-theme.css';
import '../web/pokedex-center.css';
import '../web/pokedex-editors.css';
import '../web/battle-focus.css';
import '../web/permanent-shop.css';
import '../web/account.css';
import '../web/run-maintenance.css';
import '../web/mobile-ui.css';
import '../web/title-screen.css';
import '../web/move-visuals.css';
import '../web/battle-layout.css';
import '../web/settings-screen.css';
import {ClickSounds} from '../web/audio-settings';

export const metadata: Metadata = {
  title: 'Pokémon Tower',
  description: '세 마리의 파트너와 시작하는 포켓몬 배틀타워. 턴제 싱글 배틀 프로토타입.',
};

export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="ko"><body><ClickSounds />{children}</body></html>;
}
