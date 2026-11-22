import { useState } from 'react';
import { X } from 'lucide-react';
import type { CollabFormat, ExperienceLevel, MacroRegion, MusicianProfile } from '../types';

interface MusicianProfileModalProps {
  isOpen: boolean;
  ownerId: string;
  initialProfile?: MusicianProfile | null;
  onClose: () => void;
  onSave: (profile: MusicianProfile) => Promise<void>;
}

const MACRO_REGIONS: MacroRegion[] = [
  'Norte',
  'Nordeste',
  'Centro-Oeste',
  'Sudeste',
  'Sul',
  'Remoto / Global',
];

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'Emergente',
  'Intermediário',
  'Profissional',
  'Produtor / Diretor',
];

const COLLAB_FORMATS: CollabFormat[] = ['Remoto', 'Presencial', 'Híbrido'];

export function MusicianProfileModal({
  isOpen,
  ownerId,
  initialProfile,
  onClose,
  onSave,
}: MusicianProfileModalProps) {
  const [name, setName] = useState(initialProfile?.name || '');
  const [stageName, setStageName] = useState(initialProfile?.stageName || '');
  const [region, setRegion] = useState(initialProfile?.region || 'Nordeste · Recife, PE');
  const [macroRegion, setMacroRegion] = useState<MacroRegion>(initialProfile?.macroRegion || 'Nordeste');
  const [genresText, setGenresText] = useState(initialProfile?.genres.join(', ') || 'MPB Alternativa, Synthpop');
  const [instrumentsText, setInstrumentsText] = useState(
    initialProfile?.instruments.join(', ') || 'Guitarra, Sintetizador'
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    initialProfile?.experienceLevel || 'Intermediário'
  );
  const [collabFormat, setCollabFormat] = useState<CollabFormat>(
    initialProfile?.collabFormat || 'Híbrido'
  );
  const [availability, setAvailability] = useState(initialProfile?.availability || 'Noites e fins de semana');
  const [dawSetup, setDawSetup] = useState(initialProfile?.dawSetup || 'Ableton Live + Interface 2i2');
  const [lookingFor, setLookingFor] = useState(
    initialProfile?.lookingFor || 'Músicos de outros gêneros e regiões para compor e gravar stems.'
  );
  const [bio, setBio] = useState(
    initialProfile?.bio ||
      'Artista independente interessado em cruzar referências fora do meu nicho habitual.'
  );
  const [openToCrossNiche, setOpenToCrossNiche] = useState(initialProfile?.openToCrossNiche ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const genres = genresText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
    const instruments = instrumentsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (name.trim().length < 2 || stageName.trim().length < 2) {
      setError('Informe seu nome e nome artístico.');
      return;
    }
    if (genres.length === 0 || instruments.length === 0) {
      setError('Informe ao menos um gênero e um instrumento.');
      return;
    }
    if (bio.trim().length < 10) {
      setError('A biografia deve ter pelo menos 10 caracteres.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: initialProfile?.id || `musician_${ownerId}`,
        ownerId,
        name: name.trim(),
        stageName: stageName.trim(),
        region: region.trim(),
        macroRegion,
        genres,
        instruments,
        experienceLevel,
        collabFormat,
        availability: availability.trim(),
        bio: bio.trim(),
        dawSetup: dawSetup.trim(),
        lookingFor: lookingFor.trim(),
        avatarUrl: initialProfile?.avatarUrl || '',
        openToCrossNiche,
        isPublished: true,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2
            id="profile-modal-title"
            className="text-lg font-display font-semibold text-slate-900 dark:text-slate-50"
          >
            {initialProfile ? 'Editar meu perfil na rede' : 'Publicar perfil na rede'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar editor de perfil"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prof-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Nome completo
              </label>
              <input
                id="prof-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Lucas Andrade"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
            <div>
              <label
                htmlFor="prof-stage"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Nome artístico / Projeto
              </label>
              <input
                id="prof-stage"
                type="text"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Ex: Andrade Modular"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prof-macro"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Macrorregião
              </label>
              <select
                id="prof-macro"
                value={macroRegion}
                onChange={(e) => setMacroRegion(e.target.value as MacroRegion)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {MACRO_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="prof-city"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Cidade / Estado
              </label>
              <input
                id="prof-city"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Ex: Nordeste · Salvador, BA"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="prof-genres"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Gêneros musicais (separados por vírgula)
              </label>
              <input
                id="prof-genres"
                type="text"
                value={genresText}
                onChange={(e) => setGenresText(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
            <div>
              <label
                htmlFor="prof-instruments"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Instrumentos (separados por vírgula)
              </label>
              <input
                id="prof-instruments"
                type="text"
                value={instrumentsText}
                onChange={(e) => setInstrumentsText(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="prof-exp"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Nível de experiência
              </label>
              <select
                id="prof-exp"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="prof-format"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Formato de colaboração
              </label>
              <select
                id="prof-format"
                value={collabFormat}
                onChange={(e) => setCollabFormat(e.target.value as CollabFormat)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {COLLAB_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="prof-avail"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Disponibilidade
              </label>
              <input
                id="prof-avail"
                type="text"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="prof-daw"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Setup de gravação / DAW
            </label>
            <input
              id="prof-daw"
              type="text"
              value={dawSetup}
              onChange={(e) => setDawSetup(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
              required
            />
          </div>

          <div>
            <label
              htmlFor="prof-looking"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              O que você busca fora do seu nicho?
            </label>
            <input
              id="prof-looking"
              type="text"
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
              required
            />
          </div>

          <div>
            <label
              htmlFor="prof-bio"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Biografia musical
            </label>
            <textarea
              id="prof-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg"
              required
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={openToCrossNiche}
              onChange={(e) => setOpenToCrossNiche(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-700"
            />
            <span>Aberto a projetos experimentais fora do meu nicho habitual</span>
          </label>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 dark:bg-blue-600 rounded-lg hover:bg-blue-800 dark:hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Publicar na rede'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
