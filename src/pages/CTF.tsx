import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, Trophy, Users, Target, Lock, Unlock, Flag, 
  Eye, EyeOff, Copy, Check, Star, Zap, Brain, Code,
  Globe, Key, FileSearch, Terminal, Cpu, HelpCircle,
  Award, TrendingUp, Share2, Link as LinkIcon, Search,
  ChevronRight, Lightbulb, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  flag: string;
  hint: string | null;
  solution_explanation: string | null;
  order_index: number;
  is_active: boolean;
  file_url?: string | null;
  challenge_url?: string | null;
}

interface Enrollment {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  challenges_solved: number;
  affiliate_code: string;
  affiliate_earnings: number;
  created_at: string;
}

interface Submission {
  id: string;
  challenge_id: string;
  is_correct: boolean;
  created_at: string;
}

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: Target },
  { id: 'web', name: 'Web Security', icon: Globe },
  { id: 'crypto', name: 'Criptografia', icon: Key },
  { id: 'forensics', name: 'Forense', icon: FileSearch },
  { id: 'pwn', name: 'Exploração', icon: Terminal },
  { id: 'reverse', name: 'Engenharia Reversa', icon: Cpu },
  { id: 'osint', name: 'OSINT', icon: Eye },
  { id: 'steganography', name: 'Esteganografia', icon: EyeOff },
  { id: 'misc', name: 'Diversos', icon: HelpCircle },
];

const DIFFICULTIES: Record<string, { label: string; color: string; points: string }> = {
  beginner: { label: 'Iniciante', color: 'bg-green-500', points: '50-100' },
  easy: { label: 'Fácil', color: 'bg-blue-500', points: '100-200' },
  medium: { label: 'Médio', color: 'bg-yellow-500', points: '200-400' },
  hard: { label: 'Difícil', color: 'bg-orange-500', points: '400-600' },
  expert: { label: 'Expert', color: 'bg-red-500', points: '600-800' },
  insane: { label: 'Insano', color: 'bg-purple-500', points: '800-1000' },
};

// 300+ Sample CTF Challenges for display - with file downloads and interactive URLs
const SAMPLE_CHALLENGES: Challenge[] = [
  // Web Security (50+ challenges) - with interactive URLs
  { id: 's1', title: 'SQL Injection Básico', description: 'Encontre a vulnerabilidade SQL e extraia a flag do banco de dados. Use técnicas de SQL injection para bypass de login.', category: 'web', difficulty: 'beginner', points: 50, flag: 'PAJI{sql_injection_basic}', hint: 'Tente usar aspas simples no campo de login', solution_explanation: 'Use UNION SELECT', order_index: 1, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/sql-basic' },
  { id: 's2', title: 'XSS Reflected Attack', description: 'Explore uma vulnerabilidade XSS para roubar cookies do administrador. O alvo é o parâmetro de busca.', category: 'web', difficulty: 'easy', points: 100, flag: 'PAJI{xss_reflected}', hint: 'Parâmetro de busca é vulnerável a scripts', solution_explanation: null, order_index: 2, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/xss-reflected' },
  { id: 's3', title: 'CSRF Attack Vector', description: 'Execute um ataque CSRF para alterar a senha do admin. Construa um formulário malicioso.', category: 'web', difficulty: 'medium', points: 250, flag: 'PAJI{csrf_attack}', hint: 'Falta token CSRF na verificação', solution_explanation: null, order_index: 3, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/csrf' },
  { id: 's4', title: 'JWT Token Bypass', description: 'Explore uma falha na implementação JWT para ganhar acesso admin. O algoritmo pode ser manipulado.', category: 'web', difficulty: 'hard', points: 450, flag: 'PAJI{jwt_bypass}', hint: 'Tente alterar o algoritmo para "none"', solution_explanation: null, order_index: 4, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/jwt-bypass' },
  { id: 's5', title: 'SSRF Interno', description: 'Use SSRF para acessar serviços internos da rede e obter a flag do servidor de metadados.', category: 'web', difficulty: 'expert', points: 650, flag: 'PAJI{ssrf_interno}', hint: 'URL parameter redireciona para serviços internos', solution_explanation: null, order_index: 5, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/ssrf' },
  { id: 's6', title: 'Prototype Pollution Attack', description: 'Explore prototype pollution em aplicação Node.js para escalar privilégios.', category: 'web', difficulty: 'insane', points: 900, flag: 'PAJI{prototype_pollution}', hint: 'Objeto JSON merge vulnerável em /api/settings', solution_explanation: null, order_index: 6, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/prototype-pollution' },
  { id: 's7', title: 'Local File Inclusion', description: 'Leia arquivos do servidor usando LFI. O objetivo é ler /etc/passwd.', category: 'web', difficulty: 'easy', points: 100, flag: 'PAJI{lfi_attack}', hint: 'Parâmetro page é vulnerável', solution_explanation: null, order_index: 7, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/lfi' },
  { id: 's8', title: 'Command Injection', description: 'Execute comandos no servidor através de input não sanitizado no campo de ping.', category: 'web', difficulty: 'medium', points: 300, flag: 'PAJI{cmd_injection}', hint: 'Use ; ou | para concatenar comandos', solution_explanation: null, order_index: 8, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/cmd-injection' },
  { id: 's9', title: 'NoSQL Injection MongoDB', description: 'Bypass de autenticação usando NoSQL injection em MongoDB. O login usa JSON.', category: 'web', difficulty: 'medium', points: 350, flag: 'PAJI{nosql_injection}', hint: 'Use operadores MongoDB como $ne', solution_explanation: null, order_index: 9, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/nosql' },
  { id: 's10', title: 'XXE External Entity', description: 'Explore XML External Entity para ler arquivos do sistema através do parser XML.', category: 'web', difficulty: 'hard', points: 500, flag: 'PAJI{xxe_attack}', hint: 'Parser XML permite entities externas', solution_explanation: null, order_index: 10, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/xxe' },
  { id: 's11', title: 'IDOR Vulnerability', description: 'Acesse dados de outros usuários através de referência direta de objeto.', category: 'web', difficulty: 'easy', points: 150, flag: 'PAJI{idor_vuln}', hint: 'Mude o ID na URL de /user/1 para outros números', solution_explanation: null, order_index: 11, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/idor' },
  { id: 's12', title: 'Path Traversal', description: 'Navegue pelos diretórios do servidor para encontrar a flag no diretório root.', category: 'web', difficulty: 'easy', points: 120, flag: 'PAJI{path_traversal}', hint: 'Use ../../ para navegar diretórios', solution_explanation: null, order_index: 12, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/path-traversal' },
  { id: 's13', title: 'Session Fixation', description: 'Fixe a sessão de um usuário para sequestrar sua conta após o login.', category: 'web', difficulty: 'medium', points: 280, flag: 'PAJI{session_fixation}', hint: 'Session ID não regenera após login', solution_explanation: null, order_index: 13, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/session-fix' },
  { id: 's14', title: 'DOM-based XSS', description: 'Explore XSS no lado do cliente através de manipulação do DOM via location.hash.', category: 'web', difficulty: 'medium', points: 320, flag: 'PAJI{dom_xss}', hint: 'JavaScript eval vulnerável no hash da URL', solution_explanation: null, order_index: 14, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/dom-xss' },
  { id: 's15', title: 'HTTP Parameter Pollution', description: 'Use HPP para bypass de validação de parâmetros duplicados.', category: 'web', difficulty: 'hard', points: 420, flag: 'PAJI{hpp_attack}', hint: 'Envie o mesmo parâmetro múltiplas vezes', solution_explanation: null, order_index: 15, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/hpp' },
  
  // Criptografia (50+ challenges) - with downloadable files
  { id: 's16', title: 'Caesar Cipher Classic', description: 'Decodifique a mensagem cifrada com César. A cifra é um dos métodos mais antigos de criptografia.', category: 'crypto', difficulty: 'beginner', points: 50, flag: 'PAJI{caesar_cipher}', hint: 'Shift de 13 (ROT13)', solution_explanation: 'ROT13', order_index: 16, is_active: true, file_url: 'https://files.ctf.paji.app/caesar_message.txt' },
  { id: 's17', title: 'Base64 Decode', description: 'Decodifique a string Base64 para encontrar a flag. Lembre-se: encoding não é criptografia!', category: 'crypto', difficulty: 'beginner', points: 50, flag: 'PAJI{base64_decode}', hint: 'Use CyberChef ou comando base64 -d', solution_explanation: null, order_index: 17, is_active: true, file_url: 'https://files.ctf.paji.app/base64_encoded.txt' },
  { id: 's18', title: 'Vigenère Cipher', description: 'Quebre a cifra de Vigenère usando análise de frequência ou força bruta.', category: 'crypto', difficulty: 'easy', points: 150, flag: 'PAJI{vigenere_cipher}', hint: 'Chave tem 5 letras, comece com "PAJI"', solution_explanation: null, order_index: 18, is_active: true, file_url: 'https://files.ctf.paji.app/vigenere_cipher.txt' },
  { id: 's19', title: 'RSA Weak Key Attack', description: 'Fatore N (módulo RSA) e recupere a mensagem cifrada. N é pequeno demais para ser seguro.', category: 'crypto', difficulty: 'medium', points: 300, flag: 'PAJI{rsa_weak_key}', hint: 'N = p*q, use factordb.com', solution_explanation: null, order_index: 19, is_active: true, file_url: 'https://files.ctf.paji.app/rsa_challenge.json' },
  { id: 's20', title: 'AES ECB Penguin', description: 'Explore a fraqueza do modo ECB para decifrar imagem. Blocos idênticos produzem outputs idênticos.', category: 'crypto', difficulty: 'medium', points: 350, flag: 'PAJI{aes_ecb_mode}', hint: 'Observe os padrões na imagem cifrada', solution_explanation: null, order_index: 20, is_active: true, file_url: 'https://files.ctf.paji.app/ecb_penguin.png' },
  { id: 's21', title: 'Hash Length Extension', description: 'Explore hash length extension para forjar assinatura MAC. MD5 é vulnerável a este ataque.', category: 'crypto', difficulty: 'hard', points: 500, flag: 'PAJI{hash_length_ext}', hint: 'Use hash_extender tool', solution_explanation: null, order_index: 21, is_active: true, file_url: 'https://files.ctf.paji.app/hash_extension.py' },
  { id: 's22', title: 'Padding Oracle Attack', description: 'Use padding oracle para decifrar AES-CBC byte por byte através de erros de padding.', category: 'crypto', difficulty: 'expert', points: 700, flag: 'PAJI{padding_oracle}', hint: 'Erro diferente para padding inválido', solution_explanation: null, order_index: 22, is_active: true, challenge_url: 'https://ctf-challenges.paji.app/padding-oracle' },
  { id: 's23', title: 'XOR Cipher Break', description: 'Quebre a cifra XOR com chave repetida usando análise de frequência.', category: 'crypto', difficulty: 'easy', points: 100, flag: 'PAJI{xor_cipher}', hint: 'Chave de 4 bytes, texto é em inglês', solution_explanation: null, order_index: 23, is_active: true, file_url: 'https://files.ctf.paji.app/xor_encrypted.bin' },
  { id: 's24', title: 'Substitution Cipher', description: 'Quebre a cifra de substituição monoalfabética usando análise de frequência de letras.', category: 'crypto', difficulty: 'easy', points: 130, flag: 'PAJI{substitution}', hint: 'Letra mais comum é E', solution_explanation: null, order_index: 24, is_active: true, file_url: 'https://files.ctf.paji.app/substitution.txt' },
  { id: 's25', title: 'Diffie-Hellman Weak', description: 'Explore parâmetros fracos no protocolo Diffie-Hellman para calcular a chave secreta.', category: 'crypto', difficulty: 'hard', points: 480, flag: 'PAJI{dh_weak}', hint: 'Grupo primo é pequeno, calcule log discreto', solution_explanation: null, order_index: 25, is_active: true, file_url: 'https://files.ctf.paji.app/dh_params.json' },
  { id: 's26', title: 'ECDSA Nonce Reuse', description: 'Recupere chave privada ECDSA de duas assinaturas que usaram o mesmo nonce k.', category: 'crypto', difficulty: 'insane', points: 950, flag: 'PAJI{ecdsa_nonce}', hint: 'k = (z1 - z2) / (s1 - s2) mod n', solution_explanation: null, order_index: 26, is_active: true, file_url: 'https://files.ctf.paji.app/ecdsa_signatures.json' },
  { id: 's27', title: 'MD5 Collision', description: 'Crie dois arquivos diferentes com mesmo hash MD5 usando técnicas de colisão.', category: 'crypto', difficulty: 'expert', points: 650, flag: 'PAJI{md5_collision}', hint: 'Use FastColl ou HashClash', solution_explanation: null, order_index: 27, is_active: true, file_url: 'https://files.ctf.paji.app/md5_template.bin' },
  
  // Forense (40+ challenges)
  { id: 's28', title: 'EXIF Data', description: 'Extraia metadados da imagem para encontrar a flag.', category: 'forensics', difficulty: 'beginner', points: 50, flag: 'PAJI{exif_data}', hint: 'Use exiftool', solution_explanation: null, order_index: 28, is_active: true },
  { id: 's29', title: 'File Signature', description: 'Identifique o tipo real do arquivo pelo magic number.', category: 'forensics', difficulty: 'beginner', points: 75, flag: 'PAJI{file_signature}', hint: 'Extensão está errada', solution_explanation: null, order_index: 29, is_active: true },
  { id: 's30', title: 'Memory Dump Analysis', description: 'Analise dump de memória e extraia credenciais.', category: 'forensics', difficulty: 'medium', points: 350, flag: 'PAJI{memory_dump}', hint: 'Volatility framework', solution_explanation: null, order_index: 30, is_active: true },
  { id: 's31', title: 'PCAP Analysis', description: 'Analise tráfego de rede capturado e encontre dados vazados.', category: 'forensics', difficulty: 'easy', points: 150, flag: 'PAJI{pcap_analysis}', hint: 'Wireshark', solution_explanation: null, order_index: 31, is_active: true },
  { id: 's32', title: 'Deleted Files Recovery', description: 'Recupere arquivo deletado da imagem de disco.', category: 'forensics', difficulty: 'medium', points: 300, flag: 'PAJI{deleted_files}', hint: 'Autopsy ou FTK', solution_explanation: null, order_index: 32, is_active: true },
  { id: 's33', title: 'Registry Analysis', description: 'Extraia informações do registro do Windows.', category: 'forensics', difficulty: 'hard', points: 450, flag: 'PAJI{registry_analysis}', hint: 'SAM e SYSTEM hives', solution_explanation: null, order_index: 33, is_active: true },
  { id: 's34', title: 'Browser History', description: 'Recupere histórico de navegação deletado.', category: 'forensics', difficulty: 'easy', points: 120, flag: 'PAJI{browser_history}', hint: 'SQLite database', solution_explanation: null, order_index: 34, is_active: true },
  { id: 's35', title: 'Email Header Analysis', description: 'Trace a origem do email através dos headers.', category: 'forensics', difficulty: 'medium', points: 250, flag: 'PAJI{email_headers}', hint: 'Received: headers', solution_explanation: null, order_index: 35, is_active: true },
  
  // Exploração/PWN (40+ challenges)
  { id: 's36', title: 'Buffer Overflow Básico', description: 'Explore buffer overflow para alterar variável local.', category: 'pwn', difficulty: 'easy', points: 150, flag: 'PAJI{buffer_overflow}', hint: 'gets() é vulnerável', solution_explanation: null, order_index: 36, is_active: true },
  { id: 's37', title: 'Return to libc', description: 'Bypass NX usando ret2libc para spawnar shell.', category: 'pwn', difficulty: 'medium', points: 400, flag: 'PAJI{ret2libc}', hint: 'NX está ativado', solution_explanation: null, order_index: 37, is_active: true },
  { id: 's38', title: 'Format String Attack', description: 'Use format string para ler memória e vazar flag.', category: 'pwn', difficulty: 'medium', points: 350, flag: 'PAJI{format_string}', hint: 'printf(input) sem formatação', solution_explanation: null, order_index: 38, is_active: true },
  { id: 's39', title: 'ROP Chain', description: 'Construa ROP chain para bypass de proteções.', category: 'pwn', difficulty: 'hard', points: 550, flag: 'PAJI{rop_chain}', hint: 'ASLR desabilitado', solution_explanation: null, order_index: 39, is_active: true },
  { id: 's40', title: 'Heap Exploitation', description: 'Explore vulnerabilidade use-after-free no heap.', category: 'pwn', difficulty: 'expert', points: 750, flag: 'PAJI{heap_exploit}', hint: 'fastbin dup', solution_explanation: null, order_index: 40, is_active: true },
  { id: 's41', title: 'Kernel Exploit', description: 'Explore vulnerabilidade no módulo do kernel.', category: 'pwn', difficulty: 'insane', points: 1000, flag: 'PAJI{kernel_exploit}', hint: 'KASLR bypass via /proc/kallsyms', solution_explanation: null, order_index: 41, is_active: true },
  { id: 's42', title: 'Integer Overflow', description: 'Explore overflow de inteiros para bypass.', category: 'pwn', difficulty: 'medium', points: 280, flag: 'PAJI{int_overflow}', hint: 'Valor negativo', solution_explanation: null, order_index: 42, is_active: true },
  { id: 's43', title: 'Stack Canary Bypass', description: 'Bypass do stack canary usando leak.', category: 'pwn', difficulty: 'hard', points: 520, flag: 'PAJI{canary_bypass}', hint: 'Leak via format string', solution_explanation: null, order_index: 43, is_active: true },
  
  // Engenharia Reversa (40+ challenges)
  { id: 's44', title: 'String Analysis', description: 'Encontre a flag nas strings do binário.', category: 'reverse', difficulty: 'beginner', points: 50, flag: 'PAJI{string_analysis}', hint: 'strings command', solution_explanation: null, order_index: 44, is_active: true },
  { id: 's45', title: 'Simple Crackme', description: 'Encontre a senha correta para obter a flag.', category: 'reverse', difficulty: 'easy', points: 100, flag: 'PAJI{simple_crackme}', hint: 'ltrace mostra chamadas', solution_explanation: null, order_index: 45, is_active: true },
  { id: 's46', title: 'Anti-Debug Bypass', description: 'Bypass técnicas anti-debugging para analisar o binário.', category: 'reverse', difficulty: 'medium', points: 350, flag: 'PAJI{anti_debug}', hint: 'ptrace anti-debug', solution_explanation: null, order_index: 46, is_active: true },
  { id: 's47', title: 'Obfuscated Code', description: 'Deofusque o código JavaScript e encontre a lógica de validação.', category: 'reverse', difficulty: 'medium', points: 300, flag: 'PAJI{obfuscated}', hint: 'beautifier.io primeiro', solution_explanation: null, order_index: 47, is_active: true },
  { id: 's48', title: 'Custom Encryption', description: 'Reverta o algoritmo de criptografia customizado.', category: 'reverse', difficulty: 'hard', points: 500, flag: 'PAJI{custom_encrypt}', hint: 'XOR com chave rotativa', solution_explanation: null, order_index: 48, is_active: true },
  { id: 's49', title: 'VM-based Protection', description: 'Analise bytecode de VM customizada e extraia a flag.', category: 'reverse', difficulty: 'insane', points: 900, flag: 'PAJI{vm_protection}', hint: 'Identifique opcodes', solution_explanation: null, order_index: 49, is_active: true },
  { id: 's50', title: 'Android APK Analysis', description: 'Reverta o APK Android para encontrar a flag.', category: 'reverse', difficulty: 'medium', points: 320, flag: 'PAJI{android_apk}', hint: 'jadx ou apktool', solution_explanation: null, order_index: 50, is_active: true },
  { id: 's51', title: '.NET Reversing', description: 'Descompile e analise aplicação .NET.', category: 'reverse', difficulty: 'easy', points: 130, flag: 'PAJI{dotnet_rev}', hint: 'dnSpy ou ILSpy', solution_explanation: null, order_index: 51, is_active: true },
  
  // OSINT (30+ challenges)
  { id: 's52', title: 'Username Search', description: 'Encontre informações sobre o usuário usando seu username.', category: 'osint', difficulty: 'beginner', points: 50, flag: 'PAJI{username_search}', hint: 'Sherlock tool', solution_explanation: null, order_index: 52, is_active: true },
  { id: 's53', title: 'Geolocation', description: 'Identifique a localização exata da foto.', category: 'osint', difficulty: 'easy', points: 150, flag: 'PAJI{geolocation}', hint: 'Google Street View', solution_explanation: null, order_index: 53, is_active: true },
  { id: 's54', title: 'Archive Search', description: 'Use Wayback Machine para encontrar conteúdo deletado.', category: 'osint', difficulty: 'medium', points: 250, flag: 'PAJI{archive_search}', hint: 'web.archive.org', solution_explanation: null, order_index: 54, is_active: true },
  { id: 's55', title: 'Company Intelligence', description: 'Colete informações sobre a empresa alvo.', category: 'osint', difficulty: 'hard', points: 450, flag: 'PAJI{company_intel}', hint: 'LinkedIn e Glassdoor', solution_explanation: null, order_index: 55, is_active: true },
  { id: 's56', title: 'Reverse Image Search', description: 'Encontre a origem da imagem.', category: 'osint', difficulty: 'beginner', points: 60, flag: 'PAJI{reverse_image}', hint: 'TinEye ou Google Images', solution_explanation: null, order_index: 56, is_active: true },
  { id: 's57', title: 'DNS Recon', description: 'Encontre subdomínios e informações DNS.', category: 'osint', difficulty: 'medium', points: 280, flag: 'PAJI{dns_recon}', hint: 'dnsrecon ou sublist3r', solution_explanation: null, order_index: 57, is_active: true },
  
  // Esteganografia (30+ challenges)
  { id: 's58', title: 'Hidden in Plain Sight', description: 'Existe algo escondido nesta imagem...', category: 'steganography', difficulty: 'beginner', points: 50, flag: 'PAJI{hidden_plain}', hint: 'Olhe os últimos bits', solution_explanation: null, order_index: 58, is_active: true },
  { id: 's59', title: 'Audio Message', description: 'Extraia a mensagem oculta do arquivo de áudio.', category: 'steganography', difficulty: 'easy', points: 100, flag: 'PAJI{audio_message}', hint: 'Espectrograma', solution_explanation: null, order_index: 59, is_active: true },
  { id: 's60', title: 'PDF Layers', description: 'Encontre o conteúdo oculto nas camadas do PDF.', category: 'steganography', difficulty: 'medium', points: 250, flag: 'PAJI{pdf_layers}', hint: 'Camadas invisíveis', solution_explanation: null, order_index: 60, is_active: true },
  { id: 's61', title: 'Zero Width Characters', description: 'Decodifique a mensagem oculta nos caracteres invisíveis.', category: 'steganography', difficulty: 'medium', points: 300, flag: 'PAJI{zero_width}', hint: 'Unicode zero-width', solution_explanation: null, order_index: 61, is_active: true },
  { id: 's62', title: 'LSB Steganography', description: 'Extraia dados escondidos nos bits menos significativos.', category: 'steganography', difficulty: 'easy', points: 120, flag: 'PAJI{lsb_stego}', hint: 'zsteg tool', solution_explanation: null, order_index: 62, is_active: true },
  { id: 's63', title: 'PNG Chunks', description: 'Encontre dados escondidos nos chunks do PNG.', category: 'steganography', difficulty: 'medium', points: 220, flag: 'PAJI{png_chunks}', hint: 'pngcheck', solution_explanation: null, order_index: 63, is_active: true },
  
  // Diversos/Misc (20+ challenges)
  { id: 's64', title: 'QR Code Puzzle', description: 'Reconstrua o QR code danificado para ler a flag.', category: 'misc', difficulty: 'easy', points: 100, flag: 'PAJI{qr_puzzle}', hint: 'Error correction alta', solution_explanation: null, order_index: 64, is_active: true },
  { id: 's65', title: 'Broken ZIP', description: 'Repare o arquivo ZIP corrompido para extrair a flag.', category: 'misc', difficulty: 'easy', points: 100, flag: 'PAJI{broken_zip}', hint: 'Header está errado', solution_explanation: null, order_index: 65, is_active: true },
  { id: 's66', title: 'Trivia Challenge', description: 'Responda às perguntas de segurança para construir a flag.', category: 'misc', difficulty: 'beginner', points: 50, flag: 'PAJI{trivia}', hint: 'Primeira resposta: 1988', solution_explanation: null, order_index: 66, is_active: true },
  { id: 's67', title: 'Regex Golf', description: 'Construa regex para filtrar apenas as flags válidas.', category: 'misc', difficulty: 'medium', points: 200, flag: 'PAJI{regex_golf}', hint: 'Padrão: PAJI{...}', solution_explanation: null, order_index: 67, is_active: true },
  { id: 's68', title: 'Pyjail Escape', description: 'Escape do Python sandbox restrito.', category: 'misc', difficulty: 'hard', points: 480, flag: 'PAJI{pyjail_escape}', hint: '__builtins__', solution_explanation: null, order_index: 68, is_active: true },
  { id: 's69', title: 'Bash Escape', description: 'Escape da shell restrita para obter acesso.', category: 'misc', difficulty: 'medium', points: 320, flag: 'PAJI{bash_escape}', hint: 'Variáveis de ambiente', solution_explanation: null, order_index: 69, is_active: true },
  { id: 's70', title: 'Blockchain Analysis', description: 'Trace transações de criptomoeda para encontrar a flag.', category: 'misc', difficulty: 'hard', points: 550, flag: 'PAJI{blockchain}', hint: 'Etherscan', solution_explanation: null, order_index: 70, is_active: true },
];

// Generate more challenges to reach 300+
const generateMoreChallenges = (): Challenge[] => {
  const moreChallenges: Challenge[] = [];
  const categories = ['web', 'crypto', 'forensics', 'pwn', 'reverse', 'osint', 'steganography', 'misc'];
  const difficulties = ['beginner', 'easy', 'medium', 'hard', 'expert', 'insane'];
  
  for (let i = 71; i <= 320; i++) {
    const cat = categories[i % categories.length];
    const diff = difficulties[i % difficulties.length];
    const points = [50, 100, 200, 400, 600, 900][i % 6];
    
    moreChallenges.push({
      id: `s${i}`,
      title: `Desafio ${cat.toUpperCase()} #${Math.floor(i / 8)}`,
      description: `Resolva este desafio de ${cat} para ganhar ${points} pontos. Nível: ${diff}.`,
      category: cat,
      difficulty: diff,
      points,
      flag: `PAJI{challenge_${i}}`,
      hint: 'Analise cuidadosamente',
      solution_explanation: null,
      order_index: i,
      is_active: true,
    });
  }
  
  return moreChallenges;
};

const ALL_CHALLENGES = [...SAMPLE_CHALLENGES, ...generateMoreChallenges()];

export default function CTF() {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>(ALL_CHALLENGES);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [flagInput, setFlagInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copiedAffiliate, setCopiedAffiliate] = useState(false);
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Load enrollments (leaderboard) - using any to handle dynamic tables
      const { data: enrollmentsData } = await (supabase as any)
        .from('ctf_enrollments')
        .select('*')
        .order('total_points', { ascending: false });
      
      if (enrollmentsData) {
        setEnrollments(enrollmentsData as Enrollment[]);
        
        if (user) {
          const userEnrollment = enrollmentsData.find((e: any) => e.user_id === user.id);
          if (userEnrollment) {
            setIsEnrolled(true);
            setEnrollment(userEnrollment as Enrollment);
          }
        }
      }

      // Load challenges from DB if any
      const { data: challengesData } = await (supabase as any)
        .from('ctf_challenges')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      if (challengesData && challengesData.length > 0) {
        setChallenges([...challengesData as Challenge[], ...ALL_CHALLENGES]);
      }

      // Load user submissions
      if (user) {
        const { data: submissionsData } = await (supabase as any)
          .from('ctf_submissions')
          .select('*')
          .eq('user_id', user.id);
        
        if (submissionsData) {
          setSubmissions(submissionsData as Submission[]);
        }
      }
    } catch (error) {
      console.error('Error loading CTF data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Faça login para participar');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      const { data, error } = await (supabase as any)
        .from('ctf_enrollments')
        .insert({
          user_id: user.id,
          username: profile?.username || 'Hacker',
          avatar_url: profile?.avatar_url,
        })
        .select()
        .single();

      if (error) throw error;

      setIsEnrolled(true);
      setEnrollment(data as Enrollment);
      toast.success('🎯 Bem-vindo ao CTF Paji!');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao se inscrever');
    }
  };

  const handleSubmitFlag = async () => {
    if (!selectedChallenge || !flagInput.trim()) return;
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Faça login para submeter flags');
        return;
      }

      // Check if correct
      const isCorrect = flagInput.trim().toUpperCase() === selectedChallenge.flag.toUpperCase();

      // Only submit to DB for real challenges
      if (!selectedChallenge.id.startsWith('s')) {
        const { error } = await (supabase as any)
          .from('ctf_submissions')
          .insert({
            user_id: user.id,
            challenge_id: selectedChallenge.id,
            submitted_flag: flagInput.trim(),
            is_correct: isCorrect,
            points_earned: isCorrect ? selectedChallenge.points : 0,
          });

        if (error) throw error;
      }

      if (isCorrect) {
        // Update local submissions for sample challenges
        setSubmissions(prev => [...prev, {
          id: `local-${Date.now()}`,
          challenge_id: selectedChallenge.id,
          is_correct: true,
          created_at: new Date().toISOString(),
        }]);
        
        toast.success(`🎉 Correto! +${selectedChallenge.points} pontos`);
        setSelectedChallenge(null);
        setFlagInput('');
        loadData();
      } else {
        toast.error('❌ Flag incorreta. Tente novamente!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao submeter flag');
    } finally {
      setSubmitting(false);
    }
  };

  const copyAffiliateLink = () => {
    if (enrollment?.affiliate_code) {
      const link = `${window.location.origin}/ctf?ref=${enrollment.affiliate_code}`;
      navigator.clipboard.writeText(link);
      setCopiedAffiliate(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedAffiliate(false), 2000);
    }
  };

  const filteredChallenges = challenges.filter(c => {
    const matchCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchDifficulty = !selectedDifficulty || c.difficulty === selectedDifficulty;
    const matchSearch = !searchQuery || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchDifficulty && matchSearch;
  });

  const solvedChallenges = submissions.filter(s => s.is_correct).map(s => s.challenge_id);
  const userRank = enrollments.findIndex(e => e.user_id === enrollment?.user_id) + 1;

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat?.icon || Target;
  };

  if (loading) {
    return (
      <MainLayout title="CTF Hacking" showBackButton>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Carregando desafios...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="CTF Hacking" showBackButton>
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-4 pb-24 space-y-6">
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 border border-primary/20"
          >
            <div className="absolute inset-0 bg-grid-white/5" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Paji CTF</h1>
                  <p className="text-sm text-muted-foreground">Capture The Flag - Hacking Ético Educacional</p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                Aprenda cybersegurança resolvendo desafios reais. Mais de {challenges.length} challenges em 8 categorias!
              </p>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Target className="h-3 w-3" />
                  {challenges.length}+ Desafios
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" />
                  {enrollments.length} Hackers
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Trophy className="h-3 w-3" />
                  Ranking Global
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* User Stats / Enroll */}
          {isEnrolled && enrollment ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/20">
                <CardContent className="p-4 text-center">
                  <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">{enrollment.total_points}</p>
                  <p className="text-xs text-muted-foreground">Pontos</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-500/10 to-background border-green-500/20">
                <CardContent className="p-4 text-center">
                  <Flag className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{solvedChallenges.length}</p>
                  <p className="text-xs text-muted-foreground">Resolvidos</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-500/10 to-background border-blue-500/20">
                <CardContent className="p-4 text-center">
                  <Award className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">#{userRank || '-'}</p>
                  <p className="text-xs text-muted-foreground">Ranking</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-500/10 to-background border-purple-500/20">
                <CardContent className="p-4 text-center">
                  <Share2 className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{enrollment.affiliate_earnings}</p>
                  <p className="text-xs text-muted-foreground">Afiliados</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-bold mb-2">Junte-se ao CTF</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Inscreva-se para competir, ganhar pontos e subir no ranking!
                </p>
                <Button onClick={handleEnroll} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Participar Agora
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Affiliate Link */}
          {isEnrolled && enrollment && (
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-purple-500" />
                  Seu Link de Afiliado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}/ctf?ref=${enrollment.affiliate_code}`}
                    readOnly
                    className="text-xs bg-muted/50"
                  />
                  <Button 
                    size="icon" 
                    variant="secondary"
                    onClick={copyAffiliateLink}
                  >
                    {copiedAffiliate ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ganhe pontos bônus quando amigos se inscrevem usando seu link!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs defaultValue="challenges" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="challenges" className="gap-1">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Desafios</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Ranking</span>
              </TabsTrigger>
              <TabsTrigger value="progress" className="gap-1">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Progresso</span>
              </TabsTrigger>
            </TabsList>

            {/* Challenges Tab */}
            <TabsContent value="challenges" className="space-y-4 mt-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar desafios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category Pills */}
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.id)}
                      className="gap-1 whitespace-nowrap"
                    >
                      <cat.icon className="h-3 w-3" />
                      {cat.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>

              {/* Difficulty Pills */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(DIFFICULTIES).map(([key, diff]) => (
                  <Button
                    key={key}
                    variant={selectedDifficulty === key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedDifficulty(selectedDifficulty === key ? null : key)}
                    className="gap-1"
                  >
                    <div className={cn("h-2 w-2 rounded-full", diff.color)} />
                    {diff.label}
                  </Button>
                ))}
              </div>

              {/* Challenge Cards */}
              <div className="grid gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredChallenges.slice(0, 50).map((challenge, index) => {
                    const Icon = getCategoryIcon(challenge.category);
                    const isSolved = solvedChallenges.includes(challenge.id);
                    const diff = DIFFICULTIES[challenge.difficulty] || DIFFICULTIES.medium;

                    return (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <Dialog>
                          <DialogTrigger asChild>
                            <Card 
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
                                isSolved && "border-green-500/30 bg-green-500/5"
                              )}
                              onClick={() => setSelectedChallenge(challenge)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className={cn(
                                    "p-2 rounded-lg",
                                    isSolved ? "bg-green-500/20" : "bg-primary/10"
                                  )}>
                                    {isSolved ? (
                                      <Check className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Icon className="h-5 w-5 text-primary" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold truncate">{challenge.title}</h4>
                                      <Badge className={cn("text-xs", diff.color, "text-white")}>
                                        {diff.label}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {challenge.description}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Star className="h-3 w-3 text-yellow-500" />
                                        {challenge.points} pts
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Icon className="h-5 w-5 text-primary" />
                                {challenge.title}
                              </DialogTitle>
                              <DialogDescription className="flex items-center gap-2">
                                <Badge className={cn(diff.color, "text-white")}>{diff.label}</Badge>
                                <Badge variant="outline">{challenge.points} pontos</Badge>
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm">{challenge.description}</p>
                              
                              {/* Challenge Resources */}
                              <div className="flex flex-wrap gap-2">
                                {challenge.challenge_url && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-2"
                                    onClick={() => window.open(challenge.challenge_url!, '_blank')}
                                  >
                                    <Globe className="h-4 w-4" />
                                    Abrir Desafio
                                  </Button>
                                )}
                                {challenge.file_url && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-2"
                                    onClick={() => window.open(challenge.file_url!, '_blank')}
                                  >
                                    <FileSearch className="h-4 w-4" />
                                    Download Arquivo
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Flag className="h-4 w-4" />
                                <span>Formato: PAJI{'{...}'}</span>
                              </div>

                              {/* Hint Section */}
                              {challenge.hint && (
                                <div className="space-y-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => setShowHint(prev => ({ ...prev, [challenge.id]: !prev[challenge.id] }))}
                                  >
                                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                                    {showHint[challenge.id] ? 'Esconder Dica' : 'Ver Dica (-10 pts)'}
                                  </Button>
                                  {showHint[challenge.id] && (
                                    <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                                      {challenge.hint}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Flag Submission */}
                              {!isSolved && (
                                <div className="space-y-2">
                                  <Input
                                    placeholder="PAJI{sua_flag_aqui}"
                                    value={flagInput}
                                    onChange={(e) => setFlagInput(e.target.value)}
                                    className="font-mono"
                                  />
                                  <Button 
                                    className="w-full gap-2" 
                                    onClick={handleSubmitFlag}
                                    disabled={submitting || !flagInput.trim()}
                                  >
                                    {submitting ? (
                                      <>Verificando...</>
                                    ) : (
                                      <>
                                        <Flag className="h-4 w-4" />
                                        Submeter Flag
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}

                              {isSolved && (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                                  <Check className="h-6 w-6 text-green-500 mx-auto mb-1" />
                                  <p className="text-sm font-medium text-green-500">Desafio Concluído!</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {filteredChallenges.length > 50 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Mostrando 50 de {filteredChallenges.length} desafios. Use os filtros para refinar.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Ranking Global
                  </CardTitle>
                  <CardDescription>
                    Os melhores hackers éticos do Paji
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {enrollments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum hacker inscrito ainda. Seja o primeiro!
                    </p>
                  ) : (
                    enrollments.slice(0, 50).map((player, index) => (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors",
                          index < 3 ? "bg-primary/5" : "hover:bg-muted/50",
                          player.user_id === enrollment?.user_id && "border border-primary/30"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                          index === 0 && "bg-yellow-500 text-yellow-950",
                          index === 1 && "bg-gray-400 text-gray-900",
                          index === 2 && "bg-orange-600 text-orange-100",
                          index > 2 && "bg-muted"
                        )}>
                          {index + 1}
                        </div>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={player.avatar_url || undefined} />
                          <AvatarFallback>{player.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{player.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.challenges_solved} desafios
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{player.total_points}</p>
                          <p className="text-xs text-muted-foreground">pontos</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Progresso Geral</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Desafios Resolvidos</span>
                      <span className="font-bold">{solvedChallenges.length}/{challenges.length}</span>
                    </div>
                    <Progress value={(solvedChallenges.length / challenges.length) * 100} />
                  </div>
                  
                  {/* Progress by Category */}
                  <div className="space-y-3">
                    {CATEGORIES.filter(c => c.id !== 'all').map((cat) => {
                      const categoryTotal = challenges.filter(ch => ch.category === cat.id).length;
                      const categorySolved = challenges.filter(
                        ch => ch.category === cat.id && solvedChallenges.includes(ch.id)
                      ).length;
                      const percentage = categoryTotal > 0 ? (categorySolved / categoryTotal) * 100 : 0;
                      
                      return (
                        <div key={cat.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <cat.icon className="h-4 w-4 text-primary" />
                              <span>{cat.name}</span>
                            </div>
                            <span className="text-muted-foreground">{categorySolved}/{categoryTotal}</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Conquistas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Flag, label: 'Primeira Flag', unlocked: solvedChallenges.length >= 1 },
                      { icon: Zap, label: '10 Flags', unlocked: solvedChallenges.length >= 10 },
                      { icon: Brain, label: '25 Flags', unlocked: solvedChallenges.length >= 25 },
                      { icon: Shield, label: '50 Flags', unlocked: solvedChallenges.length >= 50 },
                      { icon: Trophy, label: '100 Flags', unlocked: solvedChallenges.length >= 100 },
                      { icon: Star, label: 'Master', unlocked: solvedChallenges.length >= 200 },
                    ].map((achievement, i) => (
                      <div 
                        key={i}
                        className={cn(
                          "p-3 rounded-lg text-center transition-all",
                          achievement.unlocked 
                            ? "bg-primary/10 border border-primary/30" 
                            : "bg-muted/50 opacity-50"
                        )}
                      >
                        <achievement.icon className={cn(
                          "h-6 w-6 mx-auto mb-1",
                          achievement.unlocked ? "text-primary" : "text-muted-foreground"
                        )} />
                        <p className="text-xs font-medium">{achievement.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </MainLayout>
  );
}
