import type { Metadata } from 'next';
import './globals.css';
import {ScreenStyles} from '../web/styles/screen-styles';

import {ClickSounds} from '../web/audio-settings';

export const metadata: Metadata = {
  title: 'Pokémon Tower',
  description: '세 마리의 파트너와 시작하는 포켓몬 배틀타워. 턴제 싱글 배틀 프로토타입.',
};

export default function Layout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="ko"><body><ClickSounds /><ScreenStyles>{children}</ScreenStyles></body></html>;
}
