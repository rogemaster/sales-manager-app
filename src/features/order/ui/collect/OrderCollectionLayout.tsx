import { CollectionFilterSection } from './CollectionFilterSection';
import { CollectionActionSection } from './CollectionActionSection';
import { CollectionTableSection } from './CollectionTableSection';

export const OrderCollectionLayout = () => {
  return (
    <div className="space-y-4">
      <CollectionFilterSection />
      <CollectionActionSection />
      <CollectionTableSection />
    </div>
  );
};
