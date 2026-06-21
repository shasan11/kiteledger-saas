import GlobalSearchCommand from '@/Components/App/GlobalSearchCommand';
import { useAppContext } from '@/Contexts/AppContext';

export default function GlobalSearch(props) {
    const appContext = useAppContext();

    return <GlobalSearchCommand appContext={appContext} {...props} />;
}
